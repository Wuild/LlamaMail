import {useCallback, useMemo, useState} from 'react';
import type React from 'react';
import type {ZodTypeAny} from 'zod';

export type FormErrors<TValues extends Record<string, any>> = Partial<Record<keyof TValues, string>>;

type FormHttpParseAs = 'json' | 'text' | 'raw';

type FormHttpOptions = RequestInit & {
	parseAs?: FormHttpParseAs;
};

type FormSubmitContext = {
	http: <T = unknown>(input: RequestInfo | URL, init?: FormHttpOptions) => Promise<T>;
	ipc: <T = unknown>(invoke: () => Promise<T>) => Promise<T>;
};

type FormValidateFn<TValues extends Record<string, any>> =
	| ((values: TValues) => FormErrors<TValues> | null | undefined | Promise<FormErrors<TValues> | null | undefined>)
	| undefined;

type UseFormOptions<TValues extends Record<string, any>, TResult> = {
	initialValues: TValues;
	validate?: FormValidateFn<TValues>;
	schema?: ZodTypeAny;
	submit: (values: TValues, context: FormSubmitContext) => Promise<TResult>;
	onSuccess?: (result: TResult, values: TValues) => void | Promise<void>;
	onError?: (error: Error, values: TValues) => void | Promise<void>;
};

export class FormSubmitError extends Error {
	readonly fieldErrors: Record<string, string> | null;

	constructor(message: string, fieldErrors?: Record<string, string> | null) {
		super(message);
		this.name = 'FormSubmitError';
		this.fieldErrors = fieldErrors ?? null;
	}
}

function toErrorMessage(error: unknown, fallback = 'Unable to submit form.'): string {
	if (error instanceof Error && error.message.trim()) return error.message;
	if (typeof error === 'string' && error.trim()) return error;
	return fallback;
}

function normalizeFieldErrors(error: unknown): Record<string, string> | null {
	if (!error || typeof error !== 'object') return null;
	const payload = error as {fieldErrors?: unknown; errors?: unknown};
	const raw = payload.fieldErrors ?? payload.errors;
	if (!raw || typeof raw !== 'object') return null;
	const output: Record<string, string> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		if (typeof value === 'string' && value.trim()) {
			output[key] = value;
		}
	}
	return Object.keys(output).length ? output : null;
}

async function callHttp<T = unknown>(input: RequestInfo | URL, init: FormHttpOptions = {}): Promise<T> {
	const {parseAs = 'json', ...requestInit} = init;
	const response = await fetch(input, requestInit);
	if (!response.ok) {
		let message = `Request failed (${response.status})`;
		let fieldErrors: Record<string, string> | null = null;
		try {
			const body = await response.json();
			if (body && typeof body === 'object') {
				const payload = body as {message?: unknown; error?: unknown; fieldErrors?: unknown; errors?: unknown};
				if (typeof payload.message === 'string' && payload.message.trim()) {
					message = payload.message;
				} else if (typeof payload.error === 'string' && payload.error.trim()) {
					message = payload.error;
				}
				fieldErrors = normalizeFieldErrors(payload);
			}
		} catch {
			try {
				const text = await response.text();
				if (text.trim()) message = text.trim();
			} catch {
				// ignore parsing fallback errors
			}
		}
		throw new FormSubmitError(message, fieldErrors);
	}

	if (parseAs === 'raw') return response as T;
	if (parseAs === 'text') return (await response.text()) as T;
	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}

async function callIpc<T = unknown>(invoke: () => Promise<T>): Promise<T> {
	try {
		return await invoke();
	} catch (error) {
		const message = toErrorMessage(error, 'IPC request failed.');
		throw new FormSubmitError(message, normalizeFieldErrors(error));
	}
}

function normalizeValidationErrors<TValues extends Record<string, any>>(
	errors: FormErrors<TValues> | null | undefined,
): FormErrors<TValues> {
	if (!errors) return {};
	const output: FormErrors<TValues> = {};
	for (const [key, value] of Object.entries(errors)) {
		if (typeof value === 'string' && value.trim()) {
			(output as Record<string, string>)[key] = value;
		}
	}
	return output;
}

function mergeErrors<TValues extends Record<string, any>>(
	left: FormErrors<TValues>,
	right: FormErrors<TValues>,
): FormErrors<TValues> {
	const output: FormErrors<TValues> = {...left};
	for (const [key, value] of Object.entries(right)) {
		if (typeof value === 'string' && value.trim()) {
			(output as Record<string, string>)[key] = value;
		}
	}
	return output;
}

function extractSchemaErrors<TValues extends Record<string, any>>(schema: ZodTypeAny, values: TValues): FormErrors<TValues> {
	const result = schema.safeParse(values);
	if (result.success) return {};
	const output: FormErrors<TValues> = {};
	for (const issue of result.error.issues) {
		const path = String(issue.path[0] ?? '').trim();
		if (!path) continue;
		const message = String(issue.message || '').trim();
		if (!message) continue;
		if (!(output as Record<string, string>)[path]) {
			(output as Record<string, string>)[path] = message;
		}
	}
	return output;
}

export function useForm<TValues extends Record<string, any>, TResult>({
	initialValues,
	validate,
	schema,
	submit,
	onSuccess,
	onError,
}: UseFormOptions<TValues, TResult>) {
	const [values, setValues] = useState<TValues>(initialValues);
	const [errors, setErrors] = useState<FormErrors<TValues>>({});
	const [formError, setFormError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const validateValues = useCallback(
		async (candidate: TValues): Promise<FormErrors<TValues>> => {
			const schemaErrors = schema ? extractSchemaErrors<TValues>(schema, candidate) : {};
			const customErrors = validate ? normalizeValidationErrors<TValues>(await validate(candidate)) : {};
			return mergeErrors(schemaErrors, customErrors);
		},
		[schema, validate],
	);

	const setFieldValue = useCallback(<K extends keyof TValues>(key: K, value: TValues[K]) => {
		setValues((prev) => ({...prev, [key]: value}));
		setErrors((prev) => {
			if (!prev[key]) return prev;
			const next = {...prev};
			delete next[key];
			return next;
		});
	}, []);

	const clearFieldError = useCallback(<K extends keyof TValues>(key: K) => {
		setErrors((prev) => {
			if (!prev[key]) return prev;
			const next = {...prev};
			delete next[key];
			return next;
		});
	}, []);

	const reset = useCallback(
		(nextValues?: TValues) => {
			setValues(nextValues ?? initialValues);
			setErrors({});
			setFormError(null);
			setIsSubmitting(false);
		},
		[initialValues],
	);

	const submitValues = useCallback(
		async (overrideValues?: TValues): Promise<TResult | null> => {
			const candidate = overrideValues ?? values;
			setFormError(null);
			const validationErrors = await validateValues(candidate);
			setErrors(validationErrors);
			if (Object.keys(validationErrors).length > 0) {
				return null;
			}

			setIsSubmitting(true);
			try {
				const result = await submit(candidate, {
					http: callHttp,
					ipc: callIpc,
				});
				await onSuccess?.(result, candidate);
				return result;
			} catch (error) {
				const normalized = error instanceof Error ? error : new Error(toErrorMessage(error));
				const fieldErrors = normalizeFieldErrors(error);
				if (fieldErrors) {
					setErrors((prev) => mergeErrors(prev, fieldErrors as FormErrors<TValues>));
				}
				setFormError(toErrorMessage(normalized));
				await onError?.(normalized, candidate);
				return null;
			} finally {
				setIsSubmitting(false);
			}
		},
		[onError, onSuccess, submit, validateValues, values],
	);

	const handleSubmit = useCallback(
		(onValid?: (result: TResult) => void | Promise<void>) =>
			async (event: React.FormEvent<HTMLFormElement>) => {
				event.preventDefault();
				const result = await submitValues();
				if (result !== null) {
					await onValid?.(result);
				}
			},
		[submitValues],
	);

	return useMemo(
		() => ({
			values,
			setValues,
			setFieldValue,
			errors,
			setErrors,
			clearFieldError,
			formError,
			setFormError,
			isSubmitting,
			reset,
			submit: submitValues,
			validate: validateValues,
			handleSubmit,
		}),
		[
			clearFieldError,
			errors,
			formError,
			handleSubmit,
			isSubmitting,
			reset,
			setFieldValue,
			submitValues,
			validateValues,
			values,
		],
	);
}
