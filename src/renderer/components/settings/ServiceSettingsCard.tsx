import React from "react";
import {FormInput, FormSelect} from "../ui/FormControls";

export type ServiceSecurityMode = "ssl" | "starttls" | "none";

type ServiceSettingsCardProps = {
    title: string;
    host: string;
    port: number;
    security: ServiceSecurityMode;
    onHostChange: (value: string) => void;
    onPortChange: (value: number) => void;
    onSecurityChange: (value: ServiceSecurityMode) => void;
    allowNone?: boolean;
    tone?: "neutral" | "muted" | "sky" | "cyan";
};

const toneClasses: Record<NonNullable<ServiceSettingsCardProps["tone"]>, string> = {
    neutral: "panel",
    muted: "surface-tint-muted",
    sky: "surface-tint-info",
    cyan: "surface-tint-cyan",
};

export default function ServiceSettingsCard({
                                                title,
                                                host,
                                                port,
                                                security,
                                                onHostChange,
                                                onPortChange,
                                                onSecurityChange,
                                                allowNone = false,
                                                tone = "neutral",
                                            }: ServiceSettingsCardProps) {
    return (
        <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
            <h3 className="ui-text-primary text-sm font-semibold">{title}</h3>
            <div className="mt-3 grid grid-cols-1 gap-3">
                <label className="block text-sm">
                    <span className="ui-text-secondary mb-1 block font-medium">Host</span>
                    <FormInput
                        type="text"
                        value={host}
                        onChange={(event) => onHostChange(event.target.value)}
                    />
                </label>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block text-sm">
                        <span className="ui-text-secondary mb-1 block font-medium">Port</span>
                        <FormInput
                            type="number"
                            value={String(port || 0)}
                            onChange={(event) => onPortChange(Number(event.target.value || 0))}
                        />
                    </label>
                    <label className="block text-sm">
                        <span className="ui-text-secondary mb-1 block font-medium">Security</span>
                        <FormSelect
                            value={security}
                            onChange={(event) => onSecurityChange(event.target.value as ServiceSecurityMode)}
                        >
                            <option value="ssl">SSL/TLS</option>
                            <option value="starttls">STARTTLS</option>
                            {allowNone && <option value="none">None</option>}
                        </FormSelect>
                    </label>
                </div>
            </div>
        </div>
    );
}
