import {app, BrowserWindow} from 'electron';
import path from 'path';
import {fileURLToPath} from 'url';
import {loadWindowContent} from './loadWindowContent.js';

const isDev = !app.isPackaged;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let debugWin: BrowserWindow | null = null;

export function openDebugWindow(parentWindow?: BrowserWindow): void {
    if (debugWin && !debugWin.isDestroyed()) {
        debugWin.show();
        debugWin.focus();
        return;
    }

    const preloadPath = path.join(app.getAppPath(), 'preload.cjs');
    const parent = parentWindow && !parentWindow.isDestroyed() ? parentWindow : undefined;

    debugWin = new BrowserWindow({
        parent,
        modal: false,
        width: 980,
        height: 680,
        minWidth: 760,
        minHeight: 520,
        autoHideMenuBar: true,
        title: 'Debug Console',
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    debugWin.setMenuBarVisibility(false);
    debugWin.removeMenu();
    debugWin.on('closed', () => {
        debugWin = null;
    });

    if (isDev) {
        void loadWindowContent(debugWin, {
            isDev,
            devUrls: ['http://127.0.0.1:5174/debug.html'],
            prodFiles: [],
            windowName: 'debug',
        }).catch((error) => {
            console.error('Failed to load debug window (dev):', error);
        });
    } else {
        void loadWindowContent(debugWin, {
            isDev,
            devUrls: [],
            prodFiles: [
                path.join(__dirname, '..', '..', 'renderer/debug.html'),
            ],
            windowName: 'debug',
        }).catch((error) => {
            console.error('Failed to load debug window (prod):', error);
        });
    }
}
