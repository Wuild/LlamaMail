import {app, screen, type BrowserWindow} from 'electron';
import fs from 'fs';
import path from 'path';

type WindowStateConfig = {
	file: string;
	defaultWidth: number;
	defaultHeight: number;
};

type PersistedWindowState = {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	isMaximized?: boolean;
	isFullScreen?: boolean;
};

export type LoadedWindowState = {
	x?: number;
	y?: number;
	width: number;
	height: number;
	isMaximized: boolean;
	isFullScreen: boolean;
	save: (win: BrowserWindow) => void;
	attach: (win: BrowserWindow) => void;
	restoreDisplayState: (win: BrowserWindow) => void;
};

export function loadWindowState(config: WindowStateConfig): LoadedWindowState {
	const statePath = path.join(app.getPath('userData'), config.file);
	const rawState = readStateFile(statePath);
	const base = normalizeState(rawState, config);

	const save = (win: BrowserWindow) => {
		if (win.isDestroyed()) return;
		const normalBounds = win.isMaximized() || win.isFullScreen() ? win.getNormalBounds() : win.getBounds();
		const next: PersistedWindowState = {
			x: normalBounds.x,
			y: normalBounds.y,
			width: normalBounds.width,
			height: normalBounds.height,
			isMaximized: win.isMaximized(),
			isFullScreen: win.isFullScreen(),
		};
		writeStateFile(statePath, next);
	};

	const attach = (win: BrowserWindow) => {
		let saveTimer: ReturnType<typeof setTimeout> | null = null;
		const saveNow = () => save(win);
		const scheduleSave = () => {
			if (saveTimer) clearTimeout(saveTimer);
			saveTimer = setTimeout(() => {
				saveTimer = null;
				saveNow();
			}, 180);
		};
		const events: Array<Parameters<BrowserWindow['on']>[0]> = [
			'move',
			'resize',
			'maximize',
			'unmaximize',
			'enter-full-screen',
			'leave-full-screen',
		];
		for (const eventName of events) {
			win.on(eventName, scheduleSave);
		}
		win.on('close', saveNow);
		win.on('closed', () => {
			for (const eventName of events) {
				win.removeListener(eventName, scheduleSave);
			}
			if (saveTimer) {
				clearTimeout(saveTimer);
				saveTimer = null;
			}
		});
	};

	const restoreDisplayState = (win: BrowserWindow) => {
		if (base.isFullScreen && !win.isFullScreen()) {
			win.setFullScreen(true);
			return;
		}
		if (!base.isMaximized) return;
		const applyMaximize = () => {
			if (win.isDestroyed()) return;
			if (!win.isMaximized()) win.maximize();
		};
		applyMaximize();
		win.once('ready-to-show', applyMaximize);
	};

	return {
		x: base.x,
		y: base.y,
		width: base.width,
		height: base.height,
		isMaximized: base.isMaximized,
		isFullScreen: base.isFullScreen,
		save,
		attach,
		restoreDisplayState,
	};
}

function readStateFile(statePath: string): PersistedWindowState | null {
	try {
		const raw = fs.readFileSync(statePath, 'utf8');
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' ? (parsed as PersistedWindowState) : null;
	} catch {
		return null;
	}
}

function writeStateFile(statePath: string, state: PersistedWindowState): void {
	try {
		fs.mkdirSync(path.dirname(statePath), {recursive: true});
		fs.writeFileSync(statePath, JSON.stringify(state));
	} catch {
		// ignore state persistence failures
	}
}

function normalizeState(raw: PersistedWindowState | null, config: WindowStateConfig): PersistedWindowState {
	const primaryWorkArea = screen.getPrimaryDisplay().workArea;
	const fallbackWidth = clampSize(config.defaultWidth, 200, Math.max(200, primaryWorkArea.width));
	const fallbackHeight = clampSize(config.defaultHeight, 200, Math.max(200, primaryWorkArea.height));
	const width = clampSize(Number(raw?.width), 200, Math.max(200, primaryWorkArea.width)) || fallbackWidth;
	const height = clampSize(Number(raw?.height), 200, Math.max(200, primaryWorkArea.height)) || fallbackHeight;
	const x = Number.isFinite(Number(raw?.x)) ? Number(raw?.x) : undefined;
	const y = Number.isFinite(Number(raw?.y)) ? Number(raw?.y) : undefined;
	if (!Number.isFinite(x) || !Number.isFinite(y)) {
		return {
			width,
			height,
			isMaximized: Boolean(raw?.isMaximized),
			isFullScreen: Boolean(raw?.isFullScreen),
		};
	}
	const display = screen.getDisplayNearestPoint({x: Number(x), y: Number(y)});
	const area = display.workArea;
	const maxX = area.x + Math.max(0, area.width - width);
	const maxY = area.y + Math.max(0, area.height - height);
	return {
		x: clampSize(Number(x), area.x, maxX),
		y: clampSize(Number(y), area.y, maxY),
		width,
		height,
		isMaximized: Boolean(raw?.isMaximized),
		isFullScreen: Boolean(raw?.isFullScreen),
	};
}

function clampSize(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(Math.max(value, min), max);
}
