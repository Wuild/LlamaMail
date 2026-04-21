import {Button} from '@llamamail/ui/button';
import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Loader2, X} from '@llamamail/ui/icon';
import {useLocation, useNavigate} from 'react-router-dom';
import {DEFAULT_APP_SETTINGS} from '@llamamail/app/defaults';
import {useAccounts} from './hooks/ipc/useAccounts';
import {useAutoUpdateState} from './hooks/ipc/useAutoUpdateState';
import {useAppSettings} from './hooks/ipc/useAppSettings';
import {useIpcEvent} from './hooks/ipc/useIpcEvent';
import {ipcClient} from './lib/ipcClient';
import type {GlobalErrorEvent} from '@llamamail/app/ipcTypes';
import type {SyncStatusEvent} from '@preload';
import {ContextMenu, ContextMenuItem} from '@llamamail/ui/contextmenu';
import MainWindowRoutes from './app/MainWindowRoutes';
import {MainWindowIpcBridge} from './app/MainWindowIpcBridge';
import {useApp} from '@renderer/app/AppContext';
import {useRuntimeStore} from '@renderer/store/runtimeStore';
import {useNotificationStore} from '@renderer/store/notificationStore';

type MainNavContextItemId = 'email' | 'contacts' | 'calendar' | 'cloud' | 'settings' | 'debug' | 'help';
type MainNavContextMenuState = {
	id: MainNavContextItemId;
	label: string;
	to: string;
	x: number;
	y: number;
};

export default function MainWindowApp() {
	return <MainWindowShell />;
}

function MainWindowShell() {
	const {setShowNavRail} = useApp();
	const location = useLocation();
	const navigate = useNavigate();
	const {accounts, selectedAccountId, setSelectedAccountId} = useAccounts();
	const {autoUpdatePhase, autoUpdateMessage} = useAutoUpdateState();
	const {appSettings} = useAppSettings(DEFAULT_APP_SETTINGS);
	const developerMode = Boolean(appSettings.developerMode);
	const showRouteOverlay = developerMode && Boolean(appSettings.developerShowRouteOverlay);
	const showSendNotifications = Boolean(appSettings.developerShowSendNotifications);
	const showSystemFailureNotifications = Boolean(appSettings.developerShowSystemFailureNotifications);
	const showDebugNavItem = developerMode && Boolean(appSettings.developerShowDebugNavItem);
	const [globalErrors, setGlobalErrors] = useState<GlobalErrorEvent[]>([]);
	const [restartBusy, setRestartBusy] = useState(false);
	const notifications = useNotificationStore((state) => state.notifications);
	const createNotification = useNotificationStore((state) => state.createNotification);
	const updateNotification = useNotificationStore((state) => state.updateNotification);
	const dismissNotification = useNotificationStore((state) => state.dismissNotification);
	const clearNotificationsByCategory = useNotificationStore((state) => state.clearNotificationsByCategory);
	const applySyncEvent = useRuntimeStore((state) => state.applySyncEvent);
	const [mainNavContextMenu, setMainNavContextMenu] = useState<MainNavContextMenuState | null>(null);
	const mainNavContextMenuRef = useRef<HTMLDivElement | null>(null);

	const pushGlobalError = (entry: GlobalErrorEvent) => {
		setGlobalErrors((prev) => {
			const next = [entry, ...prev.filter((item) => item.id !== entry.id)];
			return next.slice(0, 5);
		});
	};

	const dismissGlobalError = (id: string) => {
		setGlobalErrors((prev) => prev.filter((item) => item.id !== id));
	};

	useIpcEvent(ipcClient.onGlobalError, pushGlobalError);
	useIpcEvent(ipcClient.onSendEmailBackgroundStatus, (payload) => {
		if (!showSendNotifications) return;
		const id = `send:${payload.jobId}`;
		const clampedProgress = Math.max(0, Math.min(100, Math.round(payload.progress)));
		const isFinal = payload.phase === 'sent' || payload.phase === 'failed';
		const title = payload.phase === 'failed' ? 'Send failed' : 'Sending email';
		createNotification({
			id,
			title,
			message: payload.error ? `${payload.message} ${payload.error}` : payload.message,
			progress: clampedProgress,
			busy: !isFinal,
			tone: payload.phase === 'failed' ? 'danger' : payload.phase === 'sent' ? 'success' : 'info',
			category: 'send',
			autoCloseMs: isFinal ? 4200 : null,
		});
	});
	useIpcEvent(ipcClient.onAccountSyncStatus, (payload: SyncStatusEvent) => {
		applySyncEvent(payload);
		if (!showSystemFailureNotifications) return;
		if (payload.status !== 'error') return;
		const accountName =
			accounts.find((item) => item.id === payload.accountId)?.display_name?.trim() ||
			accounts.find((item) => item.id === payload.accountId)?.email ||
			`Account ${payload.accountId}`;
		const errorText = String(payload.syncError?.message || payload.error || 'Unknown sync error').trim();
		const category = payload.syncError?.category;
		const isAuthFailure =
			category === 'auth' ||
			category === 'renewal' ||
			/(authentication|auth|password|credential|login|invalid credentials)/i.test(errorText);
		const title = isAuthFailure
			? 'Authentication failed'
			: category === 'rate_limit'
				? 'Rate limited'
				: category === 'timeout'
					? 'Sync timeout'
					: 'Sync failed';
		createNotification({
			id: `system:${isAuthFailure ? 'auth' : 'sync'}:${payload.accountId}:${errorText}`.slice(0, 160),
			title,
			message: `${accountName}: ${errorText}`,
			progress: 100,
			busy: false,
			tone: 'danger',
			category: 'system',
			autoCloseMs: 6500,
			accountId: isAuthFailure ? payload.accountId : undefined,
		});
	});

	useEffect(() => {
		if (!mainNavContextMenu) return;
		const onWindowClick = () => setMainNavContextMenu(null);
		const onWindowContextMenu = () => setMainNavContextMenu(null);
		const onEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setMainNavContextMenu(null);
		};
		window.addEventListener('click', onWindowClick);
		window.addEventListener('contextmenu', onWindowContextMenu);
		window.addEventListener('keydown', onEscape);
		return () => {
			window.removeEventListener('click', onWindowClick);
			window.removeEventListener('contextmenu', onWindowContextMenu);
			window.removeEventListener('keydown', onEscape);
		};
	}, [mainNavContextMenu]);

	useEffect(() => {
		setMainNavContextMenu(null);
	}, [location.pathname, location.search]);

	useEffect(() => {
		if (!showSendNotifications) {
			clearNotificationsByCategory('send');
		}
	}, [clearNotificationsByCategory, showSendNotifications]);

	useEffect(() => {
		if (!showSystemFailureNotifications) {
			clearNotificationsByCategory('system');
		}
	}, [clearNotificationsByCategory, showSystemFailureNotifications]);

	useEffect(() => {
		if (notifications.length === 0) return;
		const timers = notifications
			.filter((item) => !item.busy && typeof item.autoCloseMs === 'number' && item.autoCloseMs > 0)
			.map((item) =>
				window.setTimeout(() => {
					dismissNotification(item.id);
				}, item.autoCloseMs as number),
			);
		return () => {
			for (const timer of timers) window.clearTimeout(timer);
		};
	}, [dismissNotification, notifications]);

	useEffect(() => {
		const timers: number[] = [];
		const onPreview = () => {
			const jobId = `preview-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
			const id = `send:${jobId}`;
			createNotification({
				id,
				title: 'Sending email',
				message: 'Queued email for background send...',
				progress: 12,
				busy: true,
				tone: 'info',
				category: 'send',
			});
			timers.push(
				window.setTimeout(() => {
					updateNotification(id, {
						title: 'Sending email',
						message: 'Sending email...',
						progress: 62,
						busy: true,
						tone: 'info',
						category: 'send',
					});
				}, 450),
			);
			timers.push(
				window.setTimeout(() => {
					updateNotification(id, {
						title: 'Sending email',
						message: 'Email sent successfully.',
						progress: 100,
						busy: false,
						tone: 'success',
						category: 'send',
						autoCloseMs: 4200,
					});
				}, 1200),
			);
		};
		window.addEventListener('llamamail:preview-send-notification', onPreview);
		const onPreviewSyncFailure = () => {
			createNotification({
				id: `system:preview-sync-failure-${Date.now().toString(36)}`,
				title: 'Sync failed',
				message: 'Demo Account: Mailbox sync failed (timeout while fetching folder state).',
				progress: 100,
				busy: false,
				tone: 'danger',
				category: 'system',
				autoCloseMs: 6500,
			});
		};
		const onPreviewAuthFailure = () => {
			const accountId = accounts[0]?.id ?? 1;
			createNotification({
				id: `system:preview-auth-failure-${Date.now().toString(36)}`,
				title: 'Authentication failed',
				message: 'Demo Account: Invalid credentials. Password or authentication may have changed.',
				progress: 100,
				busy: false,
				tone: 'danger',
				category: 'system',
				autoCloseMs: 6500,
				accountId,
			});
		};
		window.addEventListener('llamamail:preview-sync-failure', onPreviewSyncFailure);
		window.addEventListener('llamamail:preview-auth-failure', onPreviewAuthFailure);
		return () => {
			window.removeEventListener('llamamail:preview-send-notification', onPreview);
			window.removeEventListener('llamamail:preview-sync-failure', onPreviewSyncFailure);
			window.removeEventListener('llamamail:preview-auth-failure', onPreviewAuthFailure);
			for (const timer of timers) window.clearTimeout(timer);
		};
	}, [accounts, createNotification, updateNotification]);

	useEffect(() => {
		const onWindowError = (event: ErrorEvent) => {
			pushGlobalError({
				id: `renderer-window-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				source: 'renderer-window',
				message: event.message || 'Unexpected renderer error',
				detail: event.error?.stack || `${event.filename || ''}:${event.lineno || 0}:${event.colno || 0}`,
				timestamp: new Date().toISOString(),
				fatal: false,
			});
		};
		const onUnhandledRejection = (event: PromiseRejectionEvent) => {
			const reason = event.reason;
			const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled promise rejection');
			pushGlobalError({
				id: `renderer-rejection-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
				source: 'renderer-window',
				message,
				detail: reason instanceof Error ? reason.stack : null,
				timestamp: new Date().toISOString(),
				fatal: false,
			});
		};
		window.addEventListener('error', onWindowError);
		window.addEventListener('unhandledrejection', onUnhandledRejection);
		return () => {
			window.removeEventListener('error', onWindowError);
			window.removeEventListener('unhandledrejection', onUnhandledRejection);
		};
	}, []);

	useEffect(() => {
		if (globalErrors.length === 0) return;
		const timer = window.setTimeout(() => {
			const oldest = globalErrors[globalErrors.length - 1];
			if (oldest) {
				dismissGlobalError(oldest.id);
			}
		}, 15000);
		return () => {
			window.clearTimeout(timer);
		};
	}, [globalErrors]);

	const hideMainNavRail = location.pathname.startsWith('/onboarding') || location.pathname.startsWith('/add-account');

	const showUpdateBanner =
		autoUpdatePhase === 'available' || autoUpdatePhase === 'downloading' || autoUpdatePhase === 'downloaded';
	const updateBannerText =
		autoUpdateMessage ||
		(autoUpdatePhase === 'downloaded'
			? 'An update has been downloaded and is ready to install.'
			: autoUpdatePhase === 'downloading'
				? 'A new update is downloading in the background.'
				: 'A new update is available.');
	const pendingRestartItems: string[] = [];
	if (appSettings.pendingHardwareAcceleration !== null) pendingRestartItems.push('Hardware acceleration');
	if (appSettings.pendingUseNativeTitleBar !== null) pendingRestartItems.push('Native titlebar');
	const hasRestartRequiredBanner = pendingRestartItems.length > 0;

	const onRestartNow = useCallback(() => {
		if (restartBusy) return;
		setRestartBusy(true);
		void ipcClient.restartApp().catch(() => {
			setRestartBusy(false);
		});
	}, [restartBusy]);

	useEffect(() => {
		setShowNavRail(!hideMainNavRail);
		return () => {
			setShowNavRail(false);
		};
	}, [hideMainNavRail, setShowNavRail]);

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<MainWindowIpcBridge />
			{showUpdateBanner && (
				<div className="notice-warning shrink-0 border-b px-3 py-2">
					<div className="mx-auto flex w-full max-w-350 items-center justify-between gap-3">
						<span className="text-sm font-medium">{updateBannerText}</span>
						<Button
							type="button"
							className="notice-button-warning shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold"
							onClick={() => navigate('/settings/application')}
						>
							Open update settings
						</Button>
					</div>
				</div>
			)}
			{globalErrors.length > 0 && (
				<div className="notice-danger shrink-0 border-b px-3 py-2">
					<div className="mx-auto flex w-full max-w-350 flex-col gap-2">
						{globalErrors.map((item) => (
							<div key={item.id} className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="truncate text-sm font-semibold">{item.message}</div>
									<div className="truncate text-xs opacity-80">
										{item.source} · {new Date(item.timestamp).toLocaleTimeString()}
									</div>
								</div>
								<Button
									type="button"
									className="notice-button-danger shrink-0 rounded-md px-2 py-1 text-xs font-semibold"
									onClick={() => dismissGlobalError(item.id)}
								>
									Dismiss
								</Button>
							</div>
						))}
					</div>
				</div>
			)}

			<main className="min-h-0 min-w-0 flex-1 overflow-hidden">
				<div className="flex h-full min-h-0 flex-col overflow-hidden">
					{hasRestartRequiredBanner && (
						<div className="notice-info shrink-0 border-b px-3 py-2">
							<div className="flex w-full items-center justify-between gap-3">
								<span className="text-sm font-medium">
									Restart is required to apply: {pendingRestartItems.join(', ')}.
								</span>
								<Button
									type="button"
									className="notice-button-info shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-60"
									onClick={onRestartNow}
									disabled={restartBusy}
								>
									{restartBusy ? 'Restarting...' : 'Restart now'}
								</Button>
							</div>
						</div>
					)}
					<div className="min-h-0 flex-1 overflow-hidden">
						<MainWindowRoutes
							accountId={selectedAccountId}
							accounts={accounts}
							onSelectAccount={setSelectedAccountId}
							showDebugNavItem={showDebugNavItem}
						/>
					</div>
				</div>
			</main>
			{showRouteOverlay && (
				<div
					className={`overlay route-overlay-text pointer-events-none fixed right-3 z-1200 rounded-md px-2.5 py-1.5 font-mono text-[11px] shadow-sm ${
						notifications.length > 0 ? 'bottom-21' : 'bottom-3'
					}`}
				>
					{`#${location.pathname}${location.search || ''}`}
				</div>
			)}
			{notifications.length > 0 && (
				<div className="fixed bottom-3 right-3 z-1187 flex w-[320px] max-w-[calc(100vw-1.5rem)] flex-col-reverse gap-2">
					{notifications.map((item) => (
						<div
							key={item.id}
							role={item.accountId ? 'button' : undefined}
							tabIndex={item.accountId ? 0 : -1}
							onClick={() => {
								if (!item.accountId) return;
								navigate(`/settings/account/${item.accountId}`);
							}}
							onKeyDown={(event) => {
								if (!item.accountId) return;
								if (event.key !== 'Enter' && event.key !== ' ') return;
								event.preventDefault();
								navigate(`/settings/account/${item.accountId}`);
							}}
							className={`overlay overflow-hidden rounded-md shadow-lg backdrop-blur ${
								item.accountId ? 'cursor-pointer' : ''
							}`}
						>
							<div className="px-3 py-2.5">
								<div className="flex items-center justify-between gap-2">
									<p className="ui-text-primary truncate text-sm font-medium">{item.title}</p>
									<div className="flex items-center gap-1">
										<span className="ui-text-muted text-[11px]">{item.progress}%</span>
										{!item.busy && (
											<Button
												type="button"
												className="menu-item inline-flex h-6 w-6 items-center justify-center rounded"
												onClick={() => dismissNotification(item.id)}
												aria-label="Dismiss notification"
											>
												<X size={13} />
											</Button>
										)}
									</div>
								</div>
								<p className="ui-text-secondary mt-0.5 flex items-center gap-1.5 truncate text-xs">
									{item.busy && <Loader2 size={12} className="shrink-0 animate-spin" />}
									<span className="truncate">{item.message}</span>
								</p>
							</div>
							<div className="progress-track h-1.5 w-full">
								<div
									className={`h-full transition-all duration-300 ease-out ${
										item.tone === 'danger'
											? 'progress-fill-danger'
											: item.tone === 'success'
												? 'progress-fill-success'
												: 'progress-fill-info'
									}`}
									style={{width: `${item.progress}%`}}
								/>
							</div>
						</div>
					))}
				</div>
			)}
			{mainNavContextMenu && (
				<ContextMenu
					ref={mainNavContextMenuRef}
					size="nav"
					layer="1202"
					position={{left: mainNavContextMenu.x, top: mainNavContextMenu.y}}
					onRequestClose={() => setMainNavContextMenu(null)}
					onClick={(event) => event.stopPropagation()}
					onContextMenu={(event) => event.preventDefault()}
				>
					<ContextMenuItem
						type="button"
						className="transition-colors"
						onClick={() => {
							navigate(mainNavContextMenu.to);
							setMainNavContextMenu(null);
						}}
					>
						Open {mainNavContextMenu.label}
					</ContextMenuItem>
					{mainNavContextMenu.id === 'debug' && (
						<ContextMenuItem
							type="button"
							className="transition-colors"
							onClick={() => {
								void ipcClient.openDebugWindow();
								setMainNavContextMenu(null);
							}}
						>
							Open Debug In New Window
						</ContextMenuItem>
					)}
				</ContextMenu>
			)}
		</div>
	);
}
