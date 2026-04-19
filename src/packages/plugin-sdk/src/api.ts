export interface PluginApi {
	ui: {
		toast(message: string): void;
		openModal(id: string, props?: unknown): void;
	};
	mail: {
		search(query: string): Promise<any[]>;
		get(id: string): Promise<any>;
		send(data: unknown): Promise<void>;
	};
	accounts: {
		list(): Promise<any[]>;
	};
	storage: {
		get<T = unknown>(key: string): Promise<T | null>;
		set(key: string, value: unknown): Promise<void>;
		remove(key: string): Promise<void>;
	};
}
