import React, {useEffect, useMemo, useState} from 'react';
import {Forward, Paperclip, Reply, ReplyAll, Trash2} from 'lucide-react';
import type {AppSettings, MessageBodyResult, MessageDetails} from '../../preload';
import {formatSystemDateTime} from '../lib/dateTime';

const defaultSettings: AppSettings = {
    language: 'system',
    theme: 'system',
    minimizeToTray: true,
    syncIntervalMinutes: 2,
};

export default function MessageWindowPage() {
    const [systemLocale, setSystemLocale] = useState('en-US');
    const [messageId, setMessageId] = useState<number | null>(null);
    const [message, setMessage] = useState<MessageDetails | null>(null);
    const [body, setBody] = useState<MessageBodyResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [attachmentMenu, setAttachmentMenu] = useState<{ x: number; y: number; index: number } | null>(null);
    const [showMessageDetails, setShowMessageDetails] = useState(false);

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const applyTheme = (next: AppSettings) => {
            const useDark = next.theme === 'dark' || (next.theme === 'system' && media.matches);
            document.documentElement.classList.toggle('dark', useDark);
            document.body.classList.toggle('dark', useDark);
        };

        window.electronAPI.getAppSettings().then((next) => applyTheme(next)).catch(() => applyTheme(defaultSettings));
        window.electronAPI.getSystemLocale().then((locale) => setSystemLocale(locale || 'en-US')).catch(() => undefined);
        const offSettings = window.electronAPI.onAppSettingsUpdated?.((next) => applyTheme(next));
        const onChange = () => window.electronAPI.getAppSettings().then((next) => applyTheme(next)).catch(() => applyTheme(defaultSettings));
        media.addEventListener('change', onChange);
        return () => {
            if (typeof offSettings === 'function') offSettings();
            media.removeEventListener('change', onChange);
        };
    }, []);

    useEffect(() => {
        let active = true;
        window.electronAPI.getMessageWindowTarget().then((target) => {
            if (!active) return;
            setMessageId(target);
        }).catch(() => undefined);
        const off = window.electronAPI.onMessageWindowTarget?.((target) => {
            if (!active) return;
            setMessageId(target);
        });
        return () => {
            active = false;
            if (typeof off === 'function') off();
        };
    }, []);

    useEffect(() => {
        if (!messageId) {
            setMessage(null);
            setBody(null);
            setAttachmentMenu(null);
            return;
        }
        let active = true;
        setLoading(true);
        Promise.all([
            window.electronAPI.getMessage(messageId),
            window.electronAPI.getMessageBody(messageId, `message-window-${messageId}-${Date.now()}`),
        ])
            .then(([meta, content]) => {
                if (!active) return;
                setMessage(meta);
                setBody(content);
            })
            .catch(() => {
                if (!active) return;
                setMessage(null);
                setBody(null);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [messageId]);

    const iframeSrcDoc = useMemo(() => {
        if (!body?.html) return null;
        return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base target="_blank" />
    <style>
      html, body { width: 100%; margin: 0; box-sizing: border-box; }
      #lunamail-frame-content { box-sizing: border-box; padding: 16px; }
    </style>
  </head>
  <body><div id="lunamail-frame-content">${body.html}</div></body>
</html>`;
    }, [body]);
    const attachments = body?.attachments ?? [];

    useEffect(() => {
        if (!attachmentMenu) return;
        const close = () => setAttachmentMenu(null);
        window.addEventListener('click', close);
        window.addEventListener('keydown', close);
        return () => {
            window.removeEventListener('click', close);
            window.removeEventListener('keydown', close);
        };
    }, [attachmentMenu]);

    useEffect(() => {
        setShowMessageDetails(false);
    }, [messageId]);

    function composeWithDraft(draft: {
        to?: string | null;
        cc?: string | null;
        subject?: string | null;
        body?: string | null;
        inReplyTo?: string | null;
        references?: string[] | string | null;
    }) {
        void window.electronAPI.openComposeWindow(draft);
    }

    function onReply(): void {
        if (!message) return;
        const subject = ensurePrefixedSubject(message.subject, 'Re:');
        const quote = buildReplyQuote(
            message,
            body?.text ?? htmlToText(body?.html),
            systemLocale,
        );
        const replyTo = inferReplyAddress(message);
        const inReplyTo = normalizeMessageId(message.message_id);
        const references = buildReferences(message.references_text, message.message_id);
        composeWithDraft({
            to: replyTo,
            subject,
            body: `\n\n${quote}`,
            inReplyTo,
            references,
        });
    }

    function onReplyAll(): void {
        if (!message) return;
        const subject = ensurePrefixedSubject(message.subject, 'Re:');
        const quote = buildReplyQuote(
            message,
            body?.text ?? htmlToText(body?.html),
            systemLocale,
        );
        const replyTo = inferReplyAddress(message);
        const inReplyTo = normalizeMessageId(message.message_id);
        const references = buildReferences(message.references_text, message.message_id);
        composeWithDraft({
            to: replyTo,
            cc: message.to_address || '',
            subject,
            body: `\n\n${quote}`,
            inReplyTo,
            references,
        });
    }

    function onForward(): void {
        if (!message) return;
        const subject = ensurePrefixedSubject(message.subject, 'Fwd:');
        const originalBody = body?.text ?? htmlToText(body?.html);
        const metaDate = formatSystemDateTime(message.date, systemLocale);
        const from = message.from_name || message.from_address || 'Unknown';
        const to = message.to_address || '-';
        const forwarded =
            `---------- Forwarded message ----------\n` +
            `From: ${from}\n` +
            `Date: ${metaDate}\n` +
            `Subject: ${message.subject || '(No subject)'}\n` +
            `To: ${to}\n\n` +
            `${originalBody || ''}`;

        composeWithDraft({
            to: '',
            cc: '',
            subject,
            body: forwarded,
        });
    }

    function onDelete(): void {
        if (!message) return;
        const confirmed = window.confirm(`Delete email "${message.subject || '(No subject)'}"?`);
        if (!confirmed) return;
        window.close();
        void window.electronAPI.deleteMessage(message.id)
            .catch(() => undefined);
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-100 dark:bg-[#2f3136]">
            <div className="flex h-full flex-col">
                <div
                    role="toolbar"
                    aria-label="Message actions"
                    className="shrink-0 flex w-full flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-3 py-2 dark:border-[#3a3d44] dark:bg-[#2b2d31]"
                >
                    <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-sky-600 px-2.5 text-xs font-medium text-white transition-colors hover:bg-sky-700 dark:bg-[#5865f2] dark:hover:bg-[#4f5bd5]"
                        onClick={onReply}
                    >
                        <Reply size={14}/>
                        <span>Reply</span>
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#3a3d44]"
                        onClick={onReplyAll}
                    >
                        <ReplyAll size={14}/>
                        <span>Reply all</span>
                    </button>
                    <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#3a3d44]"
                        onClick={onForward}
                    >
                        <Forward size={14}/>
                        <span>Forward</span>
                    </button>
                    <span className="mx-1 h-6 w-px bg-slate-300 dark:bg-[#3a3d44]"/>
                    <button
                        type="button"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
                        onClick={onDelete}
                    >
                        <Trash2 size={14}/>
                        <span>Delete</span>
                    </button>
                </div>
                <header
                    className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/60 px-6 py-5 dark:border-[#393c41] dark:from-[#34373d] dark:via-[#34373d] dark:to-[#3a3550]">
                    <h1 className="truncate text-2xl font-semibold text-slate-900 dark:text-slate-100">{message?.subject || 'Message'}</h1>
                    {message && (
                        <div className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                            <div><span
                                className="font-medium text-slate-500 dark:text-slate-400">From:</span> {formatFromDisplay(message)}
                            </div>
                            <div><span
                                className="font-medium text-slate-500 dark:text-slate-400">To:</span> {message.to_address || '-'}
                            </div>
                            <div><span
                                className="font-medium text-slate-500 dark:text-slate-400">Date:</span> {formatSystemDateTime(message.date, systemLocale)}
                            </div>
                        </div>
                    )}
                    {message && (
                        <>
                            <button
                                className="mt-3 inline-flex h-8 items-center rounded-md border border-slate-300 px-2.5 text-xs text-slate-700 transition-colors hover:bg-slate-100 dark:border-[#3a3d44] dark:text-slate-200 dark:hover:bg-[#3a3d44]"
                                onClick={() => setShowMessageDetails((prev) => !prev)}
                            >
                                {showMessageDetails ? 'Hide message details' : 'Show message details'}
                            </button>
                            {showMessageDetails && (
                                <div
                                    className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 dark:border-[#3a3d44] dark:bg-[#2b2d31] dark:text-slate-200">
                                    <div><span className="font-medium">From name:</span> {message.from_name || '-'}
                                    </div>
                                    <div><span
                                        className="font-medium">From address:</span> {message.from_address || '-'}</div>
                                    <div><span className="font-medium">To:</span> {message.to_address || '-'}</div>
                                    <div><span
                                        className="font-medium">Date:</span> {formatSystemDateTime(message.date, systemLocale)}
                                    </div>
                                    <div><span className="font-medium">Message-ID:</span> {message.message_id || '-'}
                                    </div>
                                    <div><span className="font-medium">In-Reply-To:</span> {message.in_reply_to || '-'}
                                    </div>
                                    <div><span
                                        className="font-medium">References:</span> {message.references_text || '-'}
                                    </div>
                                    <div><span
                                        className="font-medium">Size:</span> {message.size ? `${message.size.toLocaleString()} bytes` : '-'}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </header>

                <main className="min-h-0 flex-1 bg-white">
                    {loading && (
                        <div
                            className="flex h-full items-center justify-center text-slate-500 dark:text-slate-400">Loading
                            message...</div>
                    )}
                    {!loading && iframeSrcDoc && (
                        <iframe
                            title={`message-window-body-${message?.id || 'unknown'}`}
                            srcDoc={iframeSrcDoc}
                            sandbox="allow-popups allow-popups-to-escape-sandbox"
                            className="h-full w-full border-0 bg-white"
                        />
                    )}
                    {!loading && !iframeSrcDoc && (
                        <div className="h-full overflow-auto bg-white p-4 text-slate-900">
              <pre className="select-text whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">
                {body?.text || 'No body content available for this message.'}
              </pre>
                        </div>
                    )}
                </main>
                {!loading && attachments.length > 0 && (
                    <div
                        className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-[#3a3d44] dark:bg-[#2b2d31]">
                        <div className="overflow-x-auto overflow-y-hidden">
                            <div className="flex min-w-full w-max gap-2 pb-1">
                                {attachments.map((attachment, index) => (
                                    <button
                                        key={`${attachment.filename || 'attachment'}-${index}`}
                                        type="button"
                                        className="group flex w-[17rem] shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white p-2 text-left text-xs text-slate-700 dark:border-[#3a3d44] dark:bg-[#1f2125] dark:text-slate-200"
                                        title={attachment.filename || 'Attachment'}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setAttachmentMenu({x: event.clientX, y: event.clientY, index});
                                        }}
                                        onContextMenu={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            setAttachmentMenu({x: event.clientX, y: event.clientY, index});
                                        }}
                                    >
                                        <span
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-slate-100 text-slate-500 dark:border-[#3a3d44] dark:bg-[#2a2d31] dark:text-slate-300">
                                            <Paperclip size={15}/>
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate font-medium">
                                                {attachment.filename || 'Attachment'}
                                            </span>
                                            <span
                                                className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                                                {attachment.contentType || 'FILE'}
                                                {typeof attachment.size === 'number' ? ` • ${formatBytes(attachment.size)}` : ''}
                                            </span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {attachmentMenu && (
                    <div
                        className="fixed z-[1100] min-w-44 rounded-md border border-slate-200 bg-white p-1 shadow-xl dark:border-[#3a3d44] dark:bg-[#313338]"
                        style={{
                            left: clampToViewport(attachmentMenu.x, 184, window.innerWidth),
                            top: clampToViewport(attachmentMenu.y, 108, window.innerHeight),
                        }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <button
                            className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#3a3e52]"
                            onClick={() => {
                                if (!message) return;
                                void window.electronAPI.openMessageAttachment(message.id, attachmentMenu.index, 'open').catch(() => undefined);
                                setAttachmentMenu(null);
                            }}
                        >
                            Open
                        </button>
                        <button
                            className="block w-full rounded px-2 py-1.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#3a3e52]"
                            onClick={() => {
                                if (!message) return;
                                void window.electronAPI.openMessageAttachment(message.id, attachmentMenu.index, 'save').catch(() => undefined);
                                setAttachmentMenu(null);
                            }}
                        >
                            Save As...
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatFromDisplay(message: MessageDetails): string {
    const name = (message.from_name || '').trim();
    const address = (message.from_address || '').trim();
    if (name && address) return `${name} <${address}>`;
    if (address) return address;
    if (name) return name;
    return 'Unknown';
}

function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

function clampToViewport(value: number, size: number, limit: number): number {
    const margin = 8;
    return Math.min(Math.max(value, margin), Math.max(margin, limit - size - margin));
}

function ensurePrefixedSubject(subject: string | null, prefix: string): string {
    const raw = (subject || '').trim();
    if (!raw) return prefix;
    const lower = raw.toLowerCase();
    if (lower.startsWith(prefix.toLowerCase())) return raw;
    return `${prefix} ${raw}`;
}

function buildReplyQuote(message: MessageDetails, text: string | null, systemLocale?: string): string {
    const from = message.from_name || message.from_address || 'Unknown';
    const date = formatSystemDateTime(message.date, systemLocale);
    const body = (text || '')
        .split(/\r?\n/)
        .map((line) => `> ${line}`)
        .join('\n');
    return `On ${date}, ${from} wrote:\n${body}`;
}

function htmlToText(html: string | null | undefined): string {
    if (!html) return '';
    return String(html)
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, '\'')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function inferReplyAddress(message: MessageDetails): string {
    if (message.from_address?.trim()) return message.from_address.trim();
    const raw = message.from_name || '';
    const m = raw.match(/<([^>]+)>/);
    if (m?.[1]) return m[1].trim();
    return '';
}

function normalizeMessageId(value: string | null | undefined): string | null {
    const raw = (value || '').trim();
    if (!raw) return null;
    if (raw.startsWith('<') && raw.endsWith('>')) return raw;
    return `<${raw.replace(/^<|>$/g, '')}>`;
}

function buildReferences(existing: string | null | undefined, messageId: string | null | undefined): string[] {
    const refs = (existing || '')
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
        .map((token) => normalizeMessageId(token))
        .filter((token): token is string => Boolean(token));
    const unique = Array.from(new Set(refs));
    const current = normalizeMessageId(messageId);
    if (current && !unique.includes(current)) unique.push(current);
    return unique;
}
