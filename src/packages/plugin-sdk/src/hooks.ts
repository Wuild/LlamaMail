import {useContext} from 'react';
import {PluginRuntimeContext} from './context';

export function usePluginApi() {
	return useContext(PluginRuntimeContext).api;
}

export function useContextMenu() {
	return useContext(PluginRuntimeContext).contextMenu;
}

export function usePluginStorage() {
	const api = usePluginApi();
	return {
		get: (key: string) => api.storage.get(key),
		set: (key: string, value: unknown) => api.storage.set(key, value),
		remove: (key: string) => api.storage.remove(key),
	};
}
