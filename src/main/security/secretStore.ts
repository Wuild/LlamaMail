import keytar from 'keytar';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

type SecretFileShape = Record<string, string>;
type DevVaultShape = Record<string, string>;

const memoryCache = new Map<string, string>();
const isElectronDefaultApp = Boolean((process as typeof process & {defaultApp?: boolean}).defaultApp);
const isDevRuntime = isElectronDefaultApp || /electron/i.test(path.basename(process.execPath || ''));
const isMacDev = process.platform === 'darwin' && isDevRuntime;
const forceKeychainInDev = String(process.env.LLAMAMAIL_DEV_USE_KEYCHAIN || '').trim() === '1';
const forceFileStoreInDev = String(process.env.LLAMAMAIL_DEV_USE_FILE_STORE || '').trim() === '1';
const useDevFileStore = isMacDev && forceFileStoreInDev && !forceKeychainInDev;
const allowDevKeychainMigration = String(process.env.LLAMAMAIL_DEV_KEYCHAIN_MIGRATE || '').trim() === '1';
const allowDevVaultLegacyFallback = String(process.env.LLAMAMAIL_DEV_KEYCHAIN_LEGACY_FALLBACK || '').trim() === '1';
const devSecretsFilePath = path.join(os.homedir(), 'Library', 'Application Support', 'LlamaMail', 'dev-secrets.json');
const devVaultAccountKey = '__dev_keychain_vault__';
const devVaultService = 'LlamaMail.SecretsVault';

let devSecretsLoaded = false;
let devSecrets: SecretFileShape = {};
let devVaultLoaded = false;
let devVault: DevVaultShape = {};
let devVaultKeychainLockedOut = false;

function toCacheKey(service: string, account: string): string {
	return `${service}::${account}`;
}

async function ensureDevSecretsLoaded(): Promise<void> {
	if (!useDevFileStore || devSecretsLoaded) return;
	try {
		const raw = await fs.readFile(devSecretsFilePath, 'utf8');
		const parsed = JSON.parse(raw) as SecretFileShape;
		devSecrets = parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		devSecrets = {};
	}
	devSecretsLoaded = true;
}

async function persistDevSecrets(): Promise<void> {
	if (!useDevFileStore) return;
	await fs.mkdir(path.dirname(devSecretsFilePath), {recursive: true});
	await fs.writeFile(devSecretsFilePath, JSON.stringify(devSecrets, null, 2), {mode: 0o600});
}

function useDevKeychainVault(): boolean {
	return process.platform === 'darwin' && !useDevFileStore;
}

async function ensureDevVaultLoaded(service: string): Promise<void> {
	if (!useDevKeychainVault() || devVaultLoaded) return;
	if (devVaultKeychainLockedOut) {
		devVault = {};
		devVaultLoaded = true;
		return;
	}
	try {
		const raw = await keytar.getPassword(devVaultService, devVaultAccountKey);
		if (!raw) {
			// One-time migration path from previous service-scoped vault entries.
			try {
				const legacyVaultRaw = await keytar.getPassword(service, devVaultAccountKey);
				if (legacyVaultRaw) {
					const legacyParsed = JSON.parse(legacyVaultRaw) as DevVaultShape;
					if (legacyParsed && typeof legacyParsed === 'object') {
						for (const [legacyAccount, legacyValue] of Object.entries(legacyParsed)) {
							if (typeof legacyValue !== 'string' || !legacyValue.trim()) continue;
							devVault[toCacheKey(service, legacyAccount)] = legacyValue;
						}
						await keytar.setPassword(devVaultService, devVaultAccountKey, JSON.stringify(devVault));
					}
				}
			} catch {
				// Ignore legacy vault migration failure and continue with empty vault.
			}
			devVaultLoaded = true;
			return;
		}
		const parsed = JSON.parse(raw) as DevVaultShape;
		devVault = parsed && typeof parsed === 'object' ? parsed : {};
	} catch {
		devVaultKeychainLockedOut = true;
		devVault = {};
	}
	devVaultLoaded = true;
}

async function persistDevVault(service: string): Promise<void> {
	if (!useDevKeychainVault()) return;
	if (devVaultKeychainLockedOut) return;
	await keytar.setPassword(devVaultService, devVaultAccountKey, JSON.stringify(devVault));
}

export async function getPassword(service: string, account: string): Promise<string | null> {
	const cacheKey = toCacheKey(service, account);
	if (memoryCache.has(cacheKey)) {
		return memoryCache.get(cacheKey) ?? null;
	}
	if (useDevKeychainVault()) {
		await ensureDevVaultLoaded(service);
		const vaultKey = toCacheKey(service, account);
		const vaultValue = devVault[vaultKey];
		if (typeof vaultValue === 'string' && vaultValue.trim()) {
			memoryCache.set(cacheKey, vaultValue);
			return vaultValue;
		}
		if (!devVaultKeychainLockedOut) {
			try {
				const legacy = await keytar.getPassword(service, account);
				if (typeof legacy === 'string' && legacy.trim()) {
					devVault[vaultKey] = legacy;
					memoryCache.set(cacheKey, legacy);
					await persistDevVault(service);
					return legacy;
				}
			} catch {
				devVaultKeychainLockedOut = true;
			}
		}
		return null;
	}
	if (useDevFileStore) {
		await ensureDevSecretsLoaded();
		const value = devSecrets[cacheKey];
		if (typeof value === 'string' && value.trim()) {
			memoryCache.set(cacheKey, value);
			return value;
		}
		// Optional one-time bridge for existing dev data that still lives in Keychain.
		if (allowDevKeychainMigration) {
			try {
				const keychainValue = await keytar.getPassword(service, account);
				if (typeof keychainValue === 'string' && keychainValue.trim()) {
					devSecrets[cacheKey] = keychainValue;
					memoryCache.set(cacheKey, keychainValue);
					await persistDevSecrets();
					return keychainValue;
				}
			} catch {
				// Ignore keychain access failures in dev file mode.
			}
		}
		return null;
	}
	const value = await keytar.getPassword(service, account);
	if (typeof value === 'string' && value.trim()) {
		memoryCache.set(cacheKey, value);
		return value;
	}
	return null;
}

export async function setPassword(service: string, account: string, password: string): Promise<void> {
	const cacheKey = toCacheKey(service, account);
	memoryCache.set(cacheKey, password);
	if (useDevKeychainVault()) {
		await ensureDevVaultLoaded(service);
		const vaultKey = toCacheKey(service, account);
		devVault[vaultKey] = password;
		if (!devVaultKeychainLockedOut) {
			try {
				await persistDevVault(service);
			} catch {
				devVaultKeychainLockedOut = true;
			}
		}
		return;
	}
	if (useDevFileStore) {
		await ensureDevSecretsLoaded();
		devSecrets[cacheKey] = password;
		await persistDevSecrets();
		return;
	}
	await keytar.setPassword(service, account, password);
}

export async function deletePassword(service: string, account: string): Promise<boolean> {
	const cacheKey = toCacheKey(service, account);
	memoryCache.delete(cacheKey);
	if (useDevKeychainVault()) {
		await ensureDevVaultLoaded(service);
		const vaultKey = toCacheKey(service, account);
		const existedInVault = vaultKey in devVault;
		if (existedInVault) {
			delete devVault[vaultKey];
			if (!devVaultKeychainLockedOut) {
				try {
					await persistDevVault(service);
				} catch {
					devVaultKeychainLockedOut = true;
				}
			}
		}
		let removedLegacy = false;
		if (!devVaultKeychainLockedOut && allowDevVaultLegacyFallback) {
			try {
				removedLegacy = await keytar.deletePassword(service, account);
			} catch {
				devVaultKeychainLockedOut = true;
			}
		}
		return existedInVault || removedLegacy;
	}
	if (useDevFileStore) {
		await ensureDevSecretsLoaded();
		const existed = cacheKey in devSecrets;
		if (existed) {
			delete devSecrets[cacheKey];
			await persistDevSecrets();
		}
		return existed;
	}
	return keytar.deletePassword(service, account);
}
