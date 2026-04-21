import {useState} from 'react';
import type {AppSettings} from '@preload';
import {useAppSettings as useIpcAppSettings} from '@renderer/hooks/ipc/useAppSettings';
import {ipcClient} from '@renderer/lib/ipcClient';
import {DEFAULT_APP_SETTINGS} from '@llamamail/app/defaults';
import {APP_THEME_OPTIONS, MAIL_VIEW_OPTIONS} from '@llamamail/app/settingsOptions';
import {Container} from '@llamamail/ui/container';
import {Card} from '@llamamail/ui';
import {FormRadioGroup} from '@llamamail/ui/form';

export default function SettingsLayoutPage() {
	const {appSettings: settings, setAppSettings: setSettings} = useIpcAppSettings(DEFAULT_APP_SETTINGS);
	const [status, setStatus] = useState<string | null>(null);

	async function applySettingsPatch(patch: Partial<AppSettings>): Promise<boolean> {
		setSettings((prev: AppSettings) => ({...prev, ...patch}));
		setStatus('Saving...');
		try {
			const saved = await ipcClient.updateAppSettings(patch);
			setSettings(saved);
			setStatus('Settings saved.');
			return true;
		} catch (e: any) {
			const latest = await ipcClient.getAppSettings().catch(() => null);
			if (latest) setSettings(latest);
			setStatus(`Save failed: ${e?.message || String(e)}`);
			return false;
		}
	}

	async function onTitlebarModeChange(useNativeTitleBar: boolean): Promise<void> {
		const pendingValue = useNativeTitleBar === settings.useNativeTitleBar ? null : useNativeTitleBar;
		const saved = await applySettingsPatch({pendingUseNativeTitleBar: pendingValue});
		if (!saved) return;
		setStatus(
			pendingValue === null
				? 'Titlebar restart change cleared.'
				: 'Titlebar change queued. Restart required to apply.',
		);
	}

	const effectiveUseNativeTitleBar =
		typeof settings.pendingUseNativeTitleBar === 'boolean'
			? settings.pendingUseNativeTitleBar
			: settings.useNativeTitleBar;

	return (
		<Container>
			<Card title={'Theme'}>
				<div className="block text-sm">
					<FormRadioGroup
						aria-label="Theme"
						value={settings.theme}
						options={APP_THEME_OPTIONS.map((option) => ({
							value: option.value,
							label: option.label,
						}))}
						onChange={(value) => void applySettingsPatch({theme: value as AppSettings['theme']})}
					/>
				</div>
			</Card>

			<Card title={'Titlebar'}>
				<div className="block text-sm">
					<FormRadioGroup
						aria-label="Titlebar mode"
						value={effectiveUseNativeTitleBar ? 'native' : 'custom'}
						options={[
							{value: 'custom', label: 'Custom titlebar'},
							{value: 'native', label: 'Native titlebar'},
						]}
						onChange={(value) => void onTitlebarModeChange(value === 'native')}
					/>
					<p className="mt-2 ui-text-muted text-xs">Changing titlebar mode requires restarting the app.</p>
					{settings.pendingUseNativeTitleBar !== null && (
						<p className="notice-warning mt-2 rounded px-2 py-1 text-xs">
							Restart queued: will switch to {settings.pendingUseNativeTitleBar ? 'native' : 'custom'}{' '}
							titlebar.
						</p>
					)}
				</div>
			</Card>

			<Card title={'Mail view'}>
				<div className="block text-sm">
					<FormRadioGroup
						aria-label="Mail view"
						value={settings.mailView}
						options={MAIL_VIEW_OPTIONS.map((option) => ({
							value: option.value,
							label: option.label,
						}))}
						onChange={(value) => void applySettingsPatch({mailView: value as AppSettings['mailView']})}
					/>
					<p className="mt-2 ui-text-muted text-xs">
						Side List keeps folders and message list side-by-side. Top Table places a compact table above
						message preview.
					</p>
				</div>
			</Card>
			{status && <div className="app-footer rounded-md px-3 py-2 text-xs ui-text-muted">{status}</div>}
		</Container>
	);
}
