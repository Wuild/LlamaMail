export enum AppEvent {
	AccountAdded = 'account.added',
	AccountUpdated = 'account.updated',
	AccountDeleted = 'account.deleted',
	AccountSyncStarted = 'account.sync.started',
	AccountSyncCompleted = 'account.sync.completed',
	AccountSyncFailed = 'account.sync.failed',
	UnreadCountUpdated = 'mail.unread-count.updated',
	EmailNew = 'email.new',
	EmailReadUpdated = 'email.read-updated',
	EmailDeleted = 'email.deleted',
	AddressBookAdded = 'contacts.address-book.added',
	AddressBookDeleted = 'contacts.address-book.deleted',
	ContactAdded = 'contacts.contact.added',
	ContactUpdated = 'contacts.contact.updated',
	ContactDeleted = 'contacts.contact.deleted',
	CalendarEventAdded = 'calendar.event.added',
	CalendarEventUpdated = 'calendar.event.updated',
	CalendarEventDeleted = 'calendar.event.deleted',
	DavSyncCompleted = 'dav.sync.completed',
	CloudAccountAdded = 'cloud.account.added',
	CloudAccountUpdated = 'cloud.account.updated',
	CloudAccountDeleted = 'cloud.account.deleted',
	CloudDavSyncCompleted = 'cloud.dav.sync.completed',
	CloudFolderCreated = 'cloud.folder.created',
	CloudFilesUploaded = 'cloud.files.uploaded',
	CloudItemDeleted = 'cloud.item.deleted',
	CloudItemOpened = 'cloud.item.opened',
	CloudItemSaved = 'cloud.item.saved',
}

export type AppEventPayloads = {
	[AppEvent.AccountAdded]: {
		accountId: number;
		email: string;
	};
	[AppEvent.AccountUpdated]: {
		accountId: number;
		email: string;
	};
	[AppEvent.AccountDeleted]: {
		accountId: number;
		email: string;
	};
	[AppEvent.AccountSyncStarted]: {
		accountId: number;
		source: string;
	};
	[AppEvent.AccountSyncCompleted]: {
		accountId: number;
		source: string;
		newMessages: number;
		messages: number;
		folders: number;
	};
	[AppEvent.AccountSyncFailed]: {
		accountId: number;
		source: string;
		error: string;
		category?: string | null;
	};
	[AppEvent.UnreadCountUpdated]: {
		unreadCount: number;
	};
	[AppEvent.EmailNew]: {
		accountId: number;
		newMessages: number;
		source: string;
		target: {accountId: number; folderPath: string; messageId: number} | null;
	};
	[AppEvent.EmailReadUpdated]: {
		messageId: number;
		isRead: boolean;
		accountId: number;
		folderPath: string;
	};
	[AppEvent.EmailDeleted]: {
		messageId: number;
		accountId?: number | null;
	};
	[AppEvent.AddressBookAdded]: {
		accountId: number;
		addressBookId: number;
		name?: string | null;
	};
	[AppEvent.AddressBookDeleted]: {
		accountId: number;
		addressBookId: number;
	};
	[AppEvent.ContactAdded]: {
		accountId: number;
		contactId: number;
		email?: string | null;
	};
	[AppEvent.ContactUpdated]: {
		contactId: number;
		email?: string | null;
	};
	[AppEvent.ContactDeleted]: {
		contactId: number;
	};
	[AppEvent.CalendarEventAdded]: {
		accountId: number;
		eventId: number;
		startIso?: string | null;
	};
	[AppEvent.CalendarEventUpdated]: {
		eventId: number;
		startIso?: string | null;
	};
	[AppEvent.CalendarEventDeleted]: {
		eventId: number;
	};
	[AppEvent.DavSyncCompleted]: {
		accountId: number;
		contactsState?: string | null;
		calendarState?: string | null;
	};
	[AppEvent.CloudAccountAdded]: {
		accountId: number;
		provider: string;
		name?: string | null;
	};
	[AppEvent.CloudAccountUpdated]: {
		accountId: number;
		provider: string;
		name?: string | null;
	};
	[AppEvent.CloudAccountDeleted]: {
		accountId: number;
	};
	[AppEvent.CloudDavSyncCompleted]: {
		accountId: number;
		provider: string;
	};
	[AppEvent.CloudFolderCreated]: {
		accountId: number;
		parentPathOrToken?: string | null;
		path?: string | null;
		name?: string | null;
	};
	[AppEvent.CloudFilesUploaded]: {
		accountId: number;
		parentPathOrToken?: string | null;
		uploaded: number;
	};
	[AppEvent.CloudItemDeleted]: {
		accountId: number;
		itemPathOrToken: string;
	};
	[AppEvent.CloudItemOpened]: {
		accountId: number;
		itemPathOrToken: string;
		path: string;
	};
	[AppEvent.CloudItemSaved]: {
		accountId: number;
		itemPathOrToken: string;
		path: string;
	};
};

export type AppEventListener<TEvent extends AppEvent> = (payload: AppEventPayloads[TEvent]) => void;

export class AppEventHandler {
	private readonly listeners = new Map<AppEvent, Set<(payload: unknown) => void>>();

	on<TEvent extends AppEvent>(event: TEvent, listener: AppEventListener<TEvent>): () => void {
		const set = this.listeners.get(event) ?? new Set<(payload: unknown) => void>();
		set.add(listener as (payload: unknown) => void);
		this.listeners.set(event, set);
		return () => this.off(event, listener);
	}

	once<TEvent extends AppEvent>(event: TEvent, listener: AppEventListener<TEvent>): () => void {
		const off = this.on(event, (payload) => {
			off();
			listener(payload);
		});
		return off;
	}

	off<TEvent extends AppEvent>(event: TEvent, listener: AppEventListener<TEvent>): void {
		const set = this.listeners.get(event);
		if (!set) return;
		set.delete(listener as (payload: unknown) => void);
		if (set.size === 0) {
			this.listeners.delete(event);
		}
	}

	emit<TEvent extends AppEvent>(event: TEvent, payload: AppEventPayloads[TEvent]): void {
		const set = this.listeners.get(event);
		if (!set || set.size === 0) return;
		for (const listener of set) {
			(listener as AppEventListener<TEvent>)(payload);
		}
	}

	clear(event?: AppEvent): void {
		if (event) {
			this.listeners.delete(event);
			return;
		}
		this.listeners.clear();
	}

	listenerCount(event: AppEvent): number {
		return this.listeners.get(event)?.size ?? 0;
	}
}

export function createAppEventHandler(): AppEventHandler {
	return new AppEventHandler();
}

export const appEventHandler = createAppEventHandler();
