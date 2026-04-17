import {app, BrowserWindow, screen} from 'electron';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {loadWindowContent} from './loadWindowContent.js';

export type MainWindowState = {
	width: number;
	height: number;
	x?: number;
	y?: number;
	isMaximized?: boolean;
};

type MainWindowLogger = {
	info: (...args: any[]) => void;
	debug: (...args: any[]) => void;
};

type MainWindowManagerDeps = {
	isDev: boolean;
	logger: MainWindowLogger;
	mainWindowMinWidth: number;
	mainWindowMinHeight: number;
	buildSecureWebPreferences: (input: {preloadPath: string; spellcheck: boolean}) => Electron.WebPreferences;
	createAppWindow: (options: Electron.BrowserWindowConstructorOptions) => BrowserWindow;
	createFramelessAppWindow: (options: Electron.BrowserWindowConstructorOptions) => BrowserWindow;
	attachWindowShortcuts: (window: BrowserWindow) => void;
	getAppSettingsSync: () => {
		useNativeTitleBar: boolean;
		spellcheckEnabled: boolean;
		language: string;
		minimizeToTray: boolean;
	};
	getSpellCheckerLanguages: (language: any) => string[];
	shouldMinimizeToTray: () => boolean;
	onWindowCloseToTray: () => void;
	onWindowClosed: () => void;
	onWindowReadyToFlushGlobalErrors: (window: BrowserWindow) => void;
	onWindowDidFinishLoad?: (window: BrowserWindow) => void;
	onWindowBoundsChanged?: (window: BrowserWindow) => void;
	onWindowCreated?: (window: BrowserWindow) => void;
	onEnsureBackgroundUpdateChecks: () => void;
};

export function createMainWindowManager(deps: MainWindowManagerDeps): {
	createWindow: (options?: {initialRoute?: string | null}) => BrowserWindow;
	getMainWindow: () => BrowserWindow | null;
} {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const mainWindowStatePath = path.join(app.getPath('userData'), 'main-window-state.json');
	let mainWindow: BrowserWindow | null = null;

	function createWindow(options: {initialRoute?: string | null} = {}): BrowserWindow {
		deps.logger.info('Creating main window');
		const preloadPath = path.join(app.getAppPath(), 'preload.cjs');
		const restoredState = loadMainWindowState();
		const normalizedState = normalizeWindowState(restoredState, deps.mainWindowMinWidth, deps.mainWindowMinHeight);
		deps.logger.debug('Window state restored=%s normalized=%s', Boolean(restoredState), Boolean(normalizedState));
		const currentSettings = deps.getAppSettingsSync();
		const useNativeTitleBar = Boolean(currentSettings.useNativeTitleBar);

		const windowOptions = {
			width: normalizedState?.width ?? 1200,
			height: normalizedState?.height ?? 800,
			minWidth: deps.mainWindowMinWidth,
			minHeight: deps.mainWindowMinHeight,
			...(typeof normalizedState?.x === 'number' && typeof normalizedState?.y === 'number'
				? {x: normalizedState.x, y: normalizedState.y}
				: {}),
			webPreferences: deps.buildSecureWebPreferences({
				preloadPath,
				spellcheck: currentSettings.spellcheckEnabled,
			}),
		};
		const win = useNativeTitleBar
			? deps.createAppWindow(windowOptions)
			: deps.createFramelessAppWindow(windowOptions);
		deps.attachWindowShortcuts(win);
		if (normalizedState?.isMaximized) {
			win.maximize();
		}
		let saveStateTimer: ReturnType<typeof setTimeout> | null = null;
		const scheduleSaveState = () => {
			if (saveStateTimer) clearTimeout(saveStateTimer);
			saveStateTimer = setTimeout(() => {
				saveStateTimer = null;
				saveMainWindowState(win, mainWindowStatePath);
				deps.onWindowBoundsChanged?.(win);
			}, 200);
		};
		win.on('move', scheduleSaveState);
		win.on('resize', scheduleSaveState);
		win.on('maximize', scheduleSaveState);
		win.on('unmaximize', scheduleSaveState);
		win.webContents.session.setSpellCheckerLanguages(getSpellCheckerLanguagesSafe(deps, currentSettings.language));
		(
			win.webContents.session as typeof win.webContents.session & {
				setSpellCheckerEnabled?: (enabled: boolean) => void;
			}
		).setSpellCheckerEnabled?.(currentSettings.spellcheckEnabled);
		win.on('close', (event) => {
			const settings = deps.getAppSettingsSync();
			if (!deps.shouldMinimizeToTray() || !settings.minimizeToTray) return;
			event.preventDefault();
			win.hide();
			deps.onWindowCloseToTray();
		});
		win.on('closed', () => {
			if (saveStateTimer) {
				clearTimeout(saveStateTimer);
				saveStateTimer = null;
			}
			saveMainWindowState(win, mainWindowStatePath);
			if (mainWindow === win) {
				mainWindow = null;
			}
			deps.onWindowClosed();
		});
		mainWindow = win;
		win.webContents.once('did-finish-load', () => {
			deps.onWindowReadyToFlushGlobalErrors(win);
			deps.onWindowDidFinishLoad?.(win);
		});
		deps.logger.info('Main window created id=%d', win.id);
		deps.onEnsureBackgroundUpdateChecks();
		deps.onWindowCreated?.(win);
		const initialRouteHash =
			typeof options.initialRoute === 'string' && options.initialRoute.trim().length > 0
				? options.initialRoute
				: undefined;
		if (deps.isDev) {
			void loadWindowContent(win, {
				isDev: deps.isDev,
				devUrls: [
					{
						target: 'http://127.0.0.1:5174/window.html',
						hash: initialRouteHash,
					},
					{
						target: 'http://127.0.0.1:5174/src/renderer/window.html',
						hash: initialRouteHash,
					},
				],
				prodFiles: [],
				windowName: 'main',
			}).catch((error) => {
				console.error('Failed to load main window (dev):', error);
			});
		} else {
			void loadWindowContent(win, {
				isDev: deps.isDev,
				devUrls: [],
				prodFiles: [
					{
						target: path.join(__dirname, '..', '..', 'renderer/window.html'),
						hash: initialRouteHash,
					},
				],
				windowName: 'main',
			}).catch((error) => {
				console.error('Failed to load main window (prod):', error);
			});
		}
		return win;
	}

	return {
		createWindow,
		getMainWindow: () => mainWindow,
	};
}

function getSpellCheckerLanguagesSafe(deps: MainWindowManagerDeps, language: string): string[] {
	try {
		return deps.getSpellCheckerLanguages(language);
	} catch {
		return ['en-US'];
	}
}

function loadMainWindowState(
	statePath: string = path.join(app.getPath('userData'), 'main-window-state.json'),
): MainWindowState | null {
	try {
		if (!fs.existsSync(statePath)) return null;
		const raw = fs.readFileSync(statePath, 'utf8');
		if (!raw.trim()) return null;
		const parsed = JSON.parse(raw) as Partial<MainWindowState>;
		if (!Number.isFinite(parsed.width) || !Number.isFinite(parsed.height)) return null;
		return {
			width: Number(parsed.width),
			height: Number(parsed.height),
			...(Number.isFinite(parsed.x) ? {x: Number(parsed.x)} : {}),
			...(Number.isFinite(parsed.y) ? {y: Number(parsed.y)} : {}),
			isMaximized: Boolean(parsed.isMaximized),
		};
	} catch {
		return null;
	}
}

function saveMainWindowState(win: BrowserWindow, statePath: string): void {
	try {
		if (win.isDestroyed()) return;
		const bounds = win.getBounds();
		const nextState: MainWindowState = {
			width: bounds.width,
			height: bounds.height,
			x: bounds.x,
			y: bounds.y,
			isMaximized: win.isMaximized(),
		};
		fs.writeFileSync(statePath, JSON.stringify(nextState));
	} catch {
		// ignore state persistence failures
	}
}

function normalizeWindowState(
	state: MainWindowState | null,
	minWidth: number,
	minHeight: number,
): MainWindowState | null {
	if (!state) return null;
	const displays = screen.getAllDisplays();
	if (displays.length === 0) return state;

	const width = Math.max(minWidth, state.width);
	const height = Math.max(minHeight, state.height);
	const x = typeof state.x === 'number' ? state.x : undefined;
	const y = typeof state.y === 'number' ? state.y : undefined;
	if (typeof x !== 'number' || typeof y !== 'number') {
		return {width, height, isMaximized: state.isMaximized};
	}

	const windowRect = {x, y, width, height};
	const visible = displays.some((display) => rectsIntersect(windowRect, display.workArea));
	if (!visible) {
		return {width, height, isMaximized: state.isMaximized};
	}
	return {x, y, width, height, isMaximized: state.isMaximized};
}

function rectsIntersect(
	a: {x: number; y: number; width: number; height: number},
	b: {x: number; y: number; width: number; height: number},
): boolean {
	return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
