import {createContext} from 'react';
import type {PluginApi} from './api';

export const PluginRuntimeContext = createContext({
	api: {} as PluginApi,
	contextMenu: {
		open: (_event?: unknown, _items?: unknown[]) => {},
	},
});
