import type {PluginManifest} from './types';

export function defineManifest(manifest: PluginManifest): PluginManifest {
	return manifest;
}

export function isValidManifest(manifest: Partial<PluginManifest>): manifest is PluginManifest {
	return !!(manifest.id && manifest.name && manifest.version);
}
