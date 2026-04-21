import {create} from 'zustand';

export type AppNotificationTone = 'info' | 'success' | 'danger';
export type AppNotificationCategory = 'general' | 'send' | 'system';

export type AppNotification = {
	id: string;
	title: string;
	message: string;
	progress: number;
	busy: boolean;
	tone: AppNotificationTone;
	category: AppNotificationCategory;
	accountId?: number;
	timestampMs: number;
	autoCloseMs: number | null;
};

type CreateNotificationInput = {
	id?: string;
	title: string;
	message?: string;
	progress?: number;
	busy?: boolean;
	tone?: AppNotificationTone;
	category?: AppNotificationCategory;
	accountId?: number;
	autoCloseMs?: number | null;
};

type NotificationStoreState = {
	notifications: AppNotification[];
	createNotification: (input: CreateNotificationInput) => string;
	updateNotification: (id: string, patch: Partial<Omit<AppNotification, 'id' | 'timestampMs'>>) => void;
	dismissNotification: (id: string) => void;
	clearNotifications: () => void;
	clearNotificationsByCategory: (category: AppNotificationCategory) => void;
};

function buildNotificationId(): string {
	return `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clampPercent(value: number | undefined): number {
	const numeric = Number(value ?? 0);
	if (!Number.isFinite(numeric)) return 0;
	return Math.max(0, Math.min(100, Math.round(numeric)));
}

export const useNotificationStore = create<NotificationStoreState>((set) => ({
	notifications: [],
	createNotification: (input) => {
		const id = input.id || buildNotificationId();
		const next: AppNotification = {
			id,
			title: String(input.title || '').trim() || 'Notification',
			message: String(input.message || '').trim(),
			progress: clampPercent(input.progress),
			busy: input.busy !== false,
			tone: input.tone || 'info',
			category: input.category || 'general',
			accountId: input.accountId,
			timestampMs: Date.now(),
			autoCloseMs: input.autoCloseMs ?? null,
		};
		set((state) => ({
			notifications: [next, ...state.notifications.filter((item) => item.id !== id)].slice(0, 8),
		}));
		return id;
	},
	updateNotification: (id, patch) =>
		set((state) => ({
			notifications: state.notifications.map((item) => {
				if (item.id !== id) return item;
				return {
					...item,
					...patch,
					progress:
						typeof patch.progress === 'number' || patch.progress === undefined
							? clampPercent(patch.progress ?? item.progress)
							: item.progress,
				};
			}),
		})),
	dismissNotification: (id) =>
		set((state) => ({
			notifications: state.notifications.filter((item) => item.id !== id),
		})),
	clearNotifications: () => set({notifications: []}),
	clearNotificationsByCategory: (category) =>
		set((state) => ({
			notifications: state.notifications.filter((item) => item.category !== category),
		})),
}));
