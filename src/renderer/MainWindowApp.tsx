import React, {useEffect, useMemo, useState} from 'react';
import {Bug, CalendarDays, CircleHelp, Mail, Settings, Users} from 'lucide-react';
import {HashRouter, Navigate, NavLink, Route, Routes} from 'react-router-dom';
import MailPage from './App';
import AppSettingsPage from './pages/AppSettingsPage';
import DebugConsolePage from './pages/DebugConsolePage';
import SupportPage from './pages/SupportPage';
import type {AddressBookItem, CalendarEventItem, ContactItem, PublicAccount} from '../preload';
import {formatSystemDateTime} from './lib/dateTime';
import {cn} from './lib/utils';

export default function MainWindowApp() {
    return (
        <HashRouter>
            <MainWindowShell/>
        </HashRouter>
    );
}

function MainWindowShell() {
    const [accounts, setAccounts] = useState<PublicAccount[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [totalUnreadCount, setTotalUnreadCount] = useState(0);

    useEffect(() => {
        let active = true;
        const loadAccounts = async () => {
            const rows = await window.electronAPI.getAccounts();
            if (!active) return;
            setAccounts(rows);
            setSelectedAccountId((prev) => {
                if (prev && rows.some((account) => account.id === prev)) return prev;
                return rows[0]?.id ?? null;
            });
        };
        void loadAccounts();
        void window.electronAPI.getUnreadCount().then((count) => {
            if (!active) return;
            setTotalUnreadCount(Math.max(0, Number(count) || 0));
        }).catch(() => undefined);
        const offAdded = window.electronAPI.onAccountAdded?.(() => {
            void loadAccounts();
        });
        const offUpdated = window.electronAPI.onAccountUpdated?.((updated) => {
            setAccounts((prev) => prev.map((account) => (account.id === updated.id ? updated : account)));
        });
        const offDeleted = window.electronAPI.onAccountDeleted?.((deleted) => {
            setAccounts((prev) => prev.filter((account) => account.id !== deleted.id));
            setSelectedAccountId((prev) => (prev === deleted.id ? null : prev));
        });
        const offUnread = window.electronAPI.onUnreadCountUpdated?.((count) => {
            setTotalUnreadCount(Math.max(0, Number(count) || 0));
        });
        return () => {
            active = false;
            if (typeof offAdded === 'function') offAdded();
            if (typeof offUpdated === 'function') offUpdated();
            if (typeof offDeleted === 'function') offDeleted();
            if (typeof offUnread === 'function') offUnread();
        };
    }, []);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-[#2f3136]">
            <aside
                className="flex h-full w-16 shrink-0 flex-col items-center justify-between bg-slate-800 py-3 dark:bg-[#111216]">
                <div className="flex flex-col items-center gap-2">
                    <NavRailItem to="/mail" icon={<Mail size={18}/>} label="Mail" badgeCount={totalUnreadCount}/>
                    <NavRailItem to="/contacts" icon={<Users size={18}/>} label="Contacts"/>
                    <NavRailItem to="/calendar" icon={<CalendarDays size={18}/>} label="Calendar"/>
                </div>
                <div className="flex flex-col items-center gap-2">
                    <NavRailItem to="/settings" icon={<Settings size={16}/>} label="Settings"/>
                    <NavRailItem to="/debug" icon={<Bug size={16}/>} label="Debug"/>
                    <NavRailItem to="/help" icon={<CircleHelp size={16}/>} label="Help"/>
                </div>
            </aside>

            <main className="min-h-0 flex-1 overflow-hidden">
                <Routes>
                    <Route path="/" element={<Navigate to="/mail" replace/>}/>
                    <Route path="/mail" element={<MailPage/>}/>
                    <Route path="/contacts" element={<ContactsRoute accountId={selectedAccountId}/>}/>
                    <Route path="/calendar" element={<CalendarRoute accountId={selectedAccountId}/>}/>
                    <Route path="/settings" element={<AppSettingsPage embedded/>}/>
                    <Route path="/debug" element={<DebugConsolePage embedded/>}/>
                    <Route path="/help" element={<SupportPage embedded/>}/>
                </Routes>
            </main>
        </div>
    );
}

function NavRailItem({to, icon, label, badgeCount = 0}: {
    to: string;
    icon: React.ReactNode;
    label: string;
    badgeCount?: number
}) {
    return (
        <NavLink
            to={to}
            title={label}
            aria-label={label}
            className={({isActive}) =>
                cn(
                    'inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white',
                    isActive && 'bg-white/15 text-white',
                )
            }
        >
            <span className="relative inline-flex">
                {icon}
                {badgeCount > 0 && (
                    <span
                        className="absolute -right-2.5 -top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-5 text-white">
                        {badgeCount > 99 ? '99+' : badgeCount}
                    </span>
                )}
            </span>
        </NavLink>
    );
}

function ContactsRoute({accountId}: { accountId: number | null }) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [addressBooks, setAddressBooks] = useState<AddressBookItem[]>([]);
    const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
    const [newBookName, setNewBookName] = useState('');
    const [newContactName, setNewContactName] = useState('');
    const [newContactEmail, setNewContactEmail] = useState('');
    const [contactError, setContactError] = useState<string | null>(null);

    const loadContacts = React.useCallback(async (targetAccountId: number, q: string, bookId: number | null) => {
        const rows = await window.electronAPI.getContacts(targetAccountId, q.trim() || null, 600, bookId ?? null);
        setContacts(rows);
    }, []);

    useEffect(() => {
        if (!accountId) {
            setContacts([]);
            setAddressBooks([]);
            setSelectedBookId(null);
            setLoading(false);
            return;
        }
        let active = true;
        const load = async () => {
            setLoading(true);
            setContactError(null);
            try {
                const books = await window.electronAPI.getAddressBooks(accountId);
                if (!active) return;
                setAddressBooks(books);
                const effectiveBookId = selectedBookId && books.some((book) => book.id === selectedBookId)
                    ? selectedBookId
                    : (books[0]?.id ?? null);
                setSelectedBookId(effectiveBookId);
                const rows = await window.electronAPI.getContacts(accountId, query.trim() || null, 600, effectiveBookId);
                if (!active) return;
                setContacts(rows);
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [accountId, query, selectedBookId]);

    async function onCreateAddressBook() {
        if (!accountId) return;
        const name = newBookName.trim();
        if (!name) return;
        setContactError(null);
        try {
            const created = await window.electronAPI.addAddressBook(accountId, name);
            setAddressBooks((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setSelectedBookId(created.id);
            setNewBookName('');
        } catch (error: any) {
            setContactError(error?.message || String(error));
        }
    }

    async function onAddContact() {
        if (!accountId) return;
        const email = newContactEmail.trim();
        if (!email) return;
        setContactError(null);
        try {
            await window.electronAPI.addContact(accountId, {
                addressBookId: selectedBookId,
                fullName: newContactName.trim() || null,
                email,
            });
            setNewContactName('');
            setNewContactEmail('');
            await loadContacts(accountId, query, selectedBookId);
        } catch (error: any) {
            setContactError(error?.message || String(error));
        }
    }

    async function onDeleteContact(contactId: number) {
        if (!accountId) return;
        setContactError(null);
        try {
            await window.electronAPI.deleteContact(contactId);
            await loadContacts(accountId, query, selectedBookId);
        } catch (error: any) {
            setContactError(error?.message || String(error));
        }
    }

    return (
        <section className="h-full overflow-auto bg-slate-50 p-5 dark:bg-[#26292f]">
            <div className="mx-auto max-w-5xl">
                {!accountId && <p className="text-sm text-slate-500 dark:text-slate-400">No account selected.</p>}
                {accountId && (
                    <>
                        <div className="grid gap-3 md:grid-cols-[220px_1fr]">
                            <select
                                value={selectedBookId ?? ''}
                                onChange={(event) => setSelectedBookId(event.target.value ? Number(event.target.value) : null)}
                                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-[#3a3d44] dark:bg-[#1e1f22] dark:text-slate-100 dark:focus:border-[#5865f2]"
                            >
                                {addressBooks.map((book) => (
                                    <option key={book.id} value={book.id}>
                                        {book.name}
                                    </option>
                                ))}
                            </select>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newBookName}
                                    onChange={(event) => setNewBookName(event.target.value)}
                                    placeholder="New address book name"
                                    className="h-10 flex-1 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-[#3a3d44] dark:bg-[#1e1f22] dark:text-slate-100 dark:focus:border-[#5865f2]"
                                />
                                <button
                                    type="button"
                                    className="h-10 rounded-md bg-sky-600 px-3 text-sm font-medium text-white hover:bg-sky-700 dark:bg-[#5865f2] dark:hover:bg-[#4f5bd5]"
                                    onClick={() => void onCreateAddressBook()}
                                >
                                    Add Book
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                            <input
                                type="text"
                                value={newContactName}
                                onChange={(event) => setNewContactName(event.target.value)}
                                placeholder="Full name"
                                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-[#3a3d44] dark:bg-[#1e1f22] dark:text-slate-100 dark:focus:border-[#5865f2]"
                            />
                            <input
                                type="email"
                                value={newContactEmail}
                                onChange={(event) => setNewContactEmail(event.target.value)}
                                placeholder="Email"
                                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-[#3a3d44] dark:bg-[#1e1f22] dark:text-slate-100 dark:focus:border-[#5865f2]"
                            />
                            <button
                                type="button"
                                className="h-10 rounded-md bg-sky-600 px-3 text-sm font-medium text-white hover:bg-sky-700 dark:bg-[#5865f2] dark:hover:bg-[#4f5bd5]"
                                onClick={() => void onAddContact()}
                            >
                                Add Contact
                            </button>
                        </div>
                        <input
                            type="text"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search contacts..."
                            className="mt-3 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-500 dark:border-[#3a3d44] dark:bg-[#1e1f22] dark:text-slate-100 dark:focus:border-[#5865f2]"
                        />
                        {contactError && <p className="mt-3 text-sm text-red-600 dark:text-red-300">{contactError}</p>}
                        {loading &&
                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading contacts...</p>}
                        {!loading && contacts.length === 0 && (
                            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No contacts found.</p>
                        )}
                        {!loading && contacts.length > 0 && (
                            <div
                                className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-[#3a3d44] dark:bg-[#2b2d31]">
                                <ul className="divide-y divide-slate-200 dark:divide-[#3a3d44]">
                                    {contacts.map((contact) => (
                                        <li key={contact.id} className="px-4 py-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{contact.full_name || '(No name)'}</p>
                                                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{contact.email}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-700/50 dark:text-red-300 dark:hover:bg-red-900/30"
                                                    onClick={() => void onDeleteContact(contact.id)}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}

function CalendarRoute({accountId}: { accountId: number | null }) {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState<CalendarEventItem[]>([]);
    const [systemLocale, setSystemLocale] = useState<string>('en-US');

    useEffect(() => {
        void window.electronAPI.getSystemLocale().then((locale) => {
            setSystemLocale(locale || 'en-US');
        }).catch(() => {
            setSystemLocale('en-US');
        });
    }, []);

    useEffect(() => {
        if (!accountId) {
            setEvents([]);
            setLoading(false);
            return;
        }
        let active = true;
        const load = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const start = new Date(now);
                start.setDate(start.getDate() - 30);
                const end = new Date(now);
                end.setDate(end.getDate() + 365);
                const rows = await window.electronAPI.getCalendarEvents(accountId, start.toISOString(), end.toISOString(), 1000);
                if (!active) return;
                setEvents(rows);
            } finally {
                if (active) setLoading(false);
            }
        };
        void load();
        return () => {
            active = false;
        };
    }, [accountId]);

    const sortedEvents = useMemo(
        () => [...events].sort((a, b) => (Date.parse(a.starts_at || '') || 0) - (Date.parse(b.starts_at || '') || 0)),
        [events],
    );

    return (
        <section className="h-full overflow-auto bg-slate-50 p-5 dark:bg-[#26292f]">
            <div className="mx-auto max-w-5xl">
                {!accountId && <p className="text-sm text-slate-500 dark:text-slate-400">No account selected.</p>}
                {accountId && (
                    <>
                        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Loading events...</p>}
                        {!loading && sortedEvents.length === 0 && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">No events found.</p>
                        )}
                        {!loading && sortedEvents.length > 0 && (
                            <div
                                className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-[#3a3d44] dark:bg-[#2b2d31]">
                                <ul className="divide-y divide-slate-200 dark:divide-[#3a3d44]">
                                    {sortedEvents.map((event) => (
                                        <li key={event.id} className="px-4 py-3">
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{event.summary || '(No title)'}</p>
                                            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                                                {formatSystemDateTime(event.starts_at, systemLocale)} - {formatSystemDateTime(event.ends_at, systemLocale)}
                                            </p>
                                            {event.location && (
                                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{event.location}</p>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
