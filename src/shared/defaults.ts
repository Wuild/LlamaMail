import type {AppSettings} from './ipcTypes';

export const DEFAULT_APP_SETTINGS: AppSettings = {
    language: 'system',
    theme: 'system',
    mailView: 'side-list',
    navRailOrder: ['email', 'contacts', 'calendar', 'cloud'],
    useNativeTitleBar: false,
    blockRemoteContent: true,
    remoteContentAllowlist: [],
    minimizeToTray: true,
    syncIntervalMinutes: 2,
    autoUpdateEnabled: true,
    developerMode: false,
};

export function createDefaultAppSettings(): AppSettings {
    return {
        ...DEFAULT_APP_SETTINGS,
        navRailOrder: [...DEFAULT_APP_SETTINGS.navRailOrder],
        remoteContentAllowlist: [...DEFAULT_APP_SETTINGS.remoteContentAllowlist],
    };
}
