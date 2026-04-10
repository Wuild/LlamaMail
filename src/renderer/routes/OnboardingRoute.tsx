import React, {useMemo, useState} from 'react';
import {Navigate, useNavigate} from 'react-router-dom';
import {Button} from '../components/ui/button';
import {FormCheckbox, FormSelect} from '../components/ui/FormControls';
import SettingsAddAccount from '../pages/SettingsAddAccount';
import {APP_LANGUAGE_OPTIONS, MAIL_VIEW_OPTIONS} from '../../shared/settingsOptions';
import {parseAppLanguage} from '../../shared/settingsRules';
import {createDefaultAppSettings} from '../../shared/defaults';
import type {AppLanguage, MailView} from '../../shared/ipcTypes';
import {ipcClient} from '../lib/ipcClient';

type OnboardingRouteProps = {
    hasAccounts: boolean;
};

type OnboardingStep = 'preferences' | 'account';

export default function OnboardingRoute({hasAccounts}: OnboardingRouteProps) {
    const navigate = useNavigate();
    const defaults = useMemo(() => createDefaultAppSettings(), []);
    const [step, setStep] = useState<OnboardingStep>('preferences');
    const [language, setLanguage] = useState<AppLanguage>(defaults.language);
    const [mailView, setMailView] = useState<MailView>(defaults.mailView);
    const [minimizeToTray, setMinimizeToTray] = useState<boolean>(defaults.minimizeToTray);
    const [autoUpdateEnabled, setAutoUpdateEnabled] = useState<boolean>(defaults.autoUpdateEnabled);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (hasAccounts) {
        return <Navigate to="/email" replace/>;
    }

    async function onContinueToAccountStep() {
        setSaving(true);
        setError(null);
        try {
            await ipcClient.updateAppSettings({
                language,
                mailView,
                minimizeToTray,
                autoUpdateEnabled,
            });
            setStep('account');
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="workspace-content h-full w-full overflow-hidden">
            <div className="panel flex h-full w-full flex-col overflow-hidden border-0">
                {step === 'preferences' ? (
                    <div className="flex h-full min-h-0 flex-col">
                        <div className="ui-border-default shrink-0 border-b px-8 py-6">
                            <p className="ui-text-muted text-xs font-medium uppercase tracking-wide">First-time
                                setup</p>
                            <h1 className="ui-text-primary mt-1 text-2xl font-semibold">Welcome to LlamaMail</h1>
                            <p className="ui-text-muted mt-2 text-sm">
                                Configure a few basics before adding your first account.
                            </p>
                        </div>
                        <main className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
                            <div className="mx-auto w-full max-w-3xl space-y-4">
                                <section className="panel rounded-xl p-4">
                                    <h2 className="ui-text-primary text-base font-semibold">Basic preferences</h2>
                                    <label className="mt-3 block text-sm">
                                        <span className="ui-text-secondary mb-1 block font-medium">Language</span>
                                        <FormSelect
                                            value={language}
                                            onChange={(event) => setLanguage(parseAppLanguage(event.target.value))}
                                        >
                                            {APP_LANGUAGE_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </FormSelect>
                                    </label>
                                    <label className="mt-3 block text-sm">
                                        <span className="ui-text-secondary mb-1 block font-medium">Mail layout</span>
                                        <FormSelect
                                            value={mailView}
                                            onChange={(event) => setMailView(event.target.value as MailView)}
                                        >
                                            {MAIL_VIEW_OPTIONS.map((option) => (
                                                <option key={option.value} value={option.value}>
                                                    {option.label}
                                                </option>
                                            ))}
                                        </FormSelect>
                                    </label>
                                    <label
                                        className="ui-border-default mt-3 flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
                                        <span className="ui-text-secondary">Minimize to tray</span>
                                        <FormCheckbox
                                            checked={minimizeToTray}
                                            onChange={(event) => setMinimizeToTray(event.target.checked)}
                                        />
                                    </label>
                                    <label
                                        className="ui-border-default mt-3 flex items-center justify-between rounded-md border px-3 py-2.5 text-sm">
                                        <span className="ui-text-secondary">Enable auto updates</span>
                                        <FormCheckbox
                                            checked={autoUpdateEnabled}
                                            onChange={(event) => setAutoUpdateEnabled(event.target.checked)}
                                        />
                                    </label>
                                </section>
                                {error && <p className="notice-danger rounded-lg px-4 py-2 text-sm">{error}</p>}
                            </div>
                        </main>
                        <footer className="app-footer flex shrink-0 items-center justify-end px-8 py-4">
                            <Button
                                type="button"
                                className="button-primary rounded-md px-4 py-2 text-sm font-semibold"
                                disabled={saving}
                                onClick={() => {
                                    void onContinueToAccountStep();
                                }}
                            >
                                {saving ? 'Saving...' : 'Continue to account setup'}
                            </Button>
                        </footer>
                    </div>
                ) : (
                    <SettingsAddAccount
                        embedded
                        onCompleted={() => {
                            navigate('/email', {replace: true});
                        }}
                        onCancel={() => setStep('preferences')}
                    />
                )}
            </div>
        </div>
    );
}

