import type {ProviderDriverRegistration} from './contracts.js';

function asProviderDriverRegistration(value: unknown): ProviderDriverRegistration | null {
	if (!value || typeof value !== 'object') return null;

	const candidate = value as Partial<ProviderDriverRegistration>;

	if (typeof candidate.key !== 'string' || !candidate.key.trim()) return null;
	if (typeof candidate.label !== 'string' || !candidate.label.trim()) return null;
	if (typeof candidate.logo !== 'string' || !candidate.logo.trim()) return null;
	if (typeof candidate.createDriver !== 'function') return null;
	if (typeof candidate.createEmailSyncService !== 'function') return null;
	if (typeof candidate.createAncillarySyncService !== 'function') return null;

	return candidate as ProviderDriverRegistration;
}

const modules = import.meta.glob<Record<string, unknown>>('./drivers/*.driver.ts', {eager: true});

export async function discoverProviderDriverRegistrations(): Promise<ProviderDriverRegistration[]> {
	const registrations: ProviderDriverRegistration[] = [];

	const sortedEntries = Object.entries(modules).sort(([a], [b]) => a.localeCompare(b));

	for (const [fileName, loaded] of sortedEntries) {
		const found = Object.values(loaded).find((value) => asProviderDriverRegistration(value) !== null);

		if (!found) {
			console.warn(`[provider-drivers] Skipping ${fileName}: no valid ProviderDriverRegistration export found.`);
			continue;
		}

		registrations.push(found as ProviderDriverRegistration);
	}

	return registrations;
}
