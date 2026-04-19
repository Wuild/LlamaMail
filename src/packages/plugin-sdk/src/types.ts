import type {ComponentType} from 'react';
import type {PluginApi} from './api';

export interface PluginManifest {
	id: string;
	name: string;
	version: string;
	description?: string;
	apiVersion?: string;
	permissions?: string[];
}

export interface PluginWidget {
	slot: string;
	component: ComponentType<any>;
	order?: number;
}

export interface PluginPage {
	path: string;
	component: ComponentType<any>;
}

export interface PluginContextAction<T = unknown> {
	target: string;
	id: string;
	label: string;
	run: (context: T, api: PluginApi) => void | Promise<void>;
	when?: (context: T) => boolean;
}

export interface LlamaMailPlugin {
	manifest: PluginManifest;
	activate?: (api: PluginApi) => void | Promise<void>;
	deactivate?: () => void | Promise<void>;
	ui?: {
		widgets?: PluginWidget[];
		pages?: PluginPage[];
	};
	contextMenus?: PluginContextAction[];
}
