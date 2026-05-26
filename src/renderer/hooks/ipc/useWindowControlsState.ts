import {useEffect, useState} from 'react';
import {ipcClient} from '@renderer/lib/ipcClient';
import type {WindowControlsCapabilities} from '@preload';

export function useWindowControlsState() {
	const [isMaximized, setIsMaximized] = useState(false);
	const [isFullScreen, setIsFullScreen] = useState(false);
	const [isExpandedByBounds, setIsExpandedByBounds] = useState(false);
	const [capabilities, setCapabilities] = useState<WindowControlsCapabilities>({
		minimizable: true,
		maximizable: true,
	});

	useEffect(() => {
		let active = true;
		const refreshMaximizedState = () => {
			const widthSlack = 8;
			const heightSlack = 8;
			const nearScreenSized =
				window.innerWidth >= window.screen.availWidth - widthSlack &&
				window.innerHeight >= window.screen.availHeight - heightSlack;
			setIsExpandedByBounds((prev) => (prev === nearScreenSized ? prev : nearScreenSized));
			try {
				void ipcClient
					.isWindowMaximized()
					.then((value) => {
						if (!active) return;
						const next = Boolean(value);
						setIsMaximized((prev) => (prev === next ? prev : next));
					})
					.catch(() => undefined);
				void ipcClient
					.isWindowFullScreen()
					.then((value) => {
						if (!active) return;
						const next = Boolean(value);
						setIsFullScreen((prev) => (prev === next ? prev : next));
					})
					.catch(() => undefined);
			} catch {
				// Ignore API surface mismatches during dev preload hot swaps.
			}
		};
		const refreshCapabilities = () => {
			void ipcClient
				.getWindowControlsCapabilities()
				.then((value) => {
					if (!active) return;
					setCapabilities({
						minimizable: Boolean(value?.minimizable),
						maximizable: Boolean(value?.maximizable),
					});
				})
				.catch(() => undefined);
		};
		refreshMaximizedState();
		refreshCapabilities();
		const unsubscribeWindowState = ipcClient.onWindowFullscreenChanged((payload) => {
			if (!active) return;
			const nextFullScreen = Boolean(payload?.isFullScreen);
			const nextMaximized = Boolean(payload?.isMaximized);
			setIsFullScreen((prev) => (prev === nextFullScreen ? prev : nextFullScreen));
			setIsMaximized((prev) => (prev === nextMaximized ? prev : nextMaximized));
		});
		const intervalId = window.setInterval(refreshMaximizedState, 800);
		window.addEventListener('focus', refreshMaximizedState);
		window.addEventListener('resize', refreshMaximizedState);
		return () => {
			active = false;
			unsubscribeWindowState();
			window.clearInterval(intervalId);
			window.removeEventListener('focus', refreshMaximizedState);
			window.removeEventListener('resize', refreshMaximizedState);
		};
	}, []);

	const toggleMaximize = () =>
		ipcClient
			.toggleMaximizeWindow()
			.then((res) => {
				setIsMaximized(Boolean(res?.isMaximized));
				return res;
			})
			.catch(() => undefined);

	const minimize = () => ipcClient.minimizeWindow().catch(() => undefined);
	const close = () => ipcClient.closeWindow().catch(() => undefined);

	return {
		isMaximized,
		isFullScreen,
		isExpandedByBounds,
		capabilities,
		toggleMaximize,
		minimize,
		close,
	};
}
