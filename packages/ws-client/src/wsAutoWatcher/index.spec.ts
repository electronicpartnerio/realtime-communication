/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wsAutoWatcher } from './index';

// Mocks für Dependencies
vi.mock('../cache', () => ({
    watcherCache: new Map<string, any>(),
}));
vi.mock('./util/readWatcherCache', () => ({
    readWatcherCache: vi.fn(),
}));
vi.mock('../util/restoreWsFromSession', () => ({
    restoreWsFromSession: vi.fn(),
}));
vi.mock('./util/initClient', () => ({
    initClient: vi.fn(),
}));
vi.mock('./util/writeWatcherCache', () => ({
    writeWatcherCache: vi.fn(),
}));
vi.mock('../util/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('./util/maintainWatcherCache', () => ({
    maintainWatcherCache: vi.fn(),
}));
vi.mock('../constant', () => ({
    WS_WATCH_KEY: 'WS_WATCH_KEY',
}));

import { watcherCache } from '../cache';
import { readWatcherCache } from './util/readWatcherCache';
import { restoreWsFromSession } from '../util/restoreWsFromSession';
import { initClient } from './util/initClient';
import { writeWatcherCache } from './util/writeWatcherCache';
import { maintainWatcherCache } from './util/maintainWatcherCache';

describe('wsAutoWatcher', () => {
    const clients = [{ on: vi.fn() }, { on: vi.fn() }];

    beforeEach(() => {
        vi.clearAllMocks();
        (watcherCache as Map<string, any>).clear();

        // sessionStorage.removeItem Spy
        Object.defineProperty(window, 'sessionStorage', {
            value: {
                removeItem: vi.fn(),
            },
            writable: true,
        });

        (restoreWsFromSession as vi.Mock).mockReturnValue(clients);
    });

    it('init() liest Cache, restored Clients, initialisiert sie und maintained Cache', () => {
        const watcher = wsAutoWatcher();
        watcher.init();

        expect(readWatcherCache).toHaveBeenCalledTimes(1);
        expect(restoreWsFromSession).toHaveBeenCalledTimes(1);
        expect(initClient).toHaveBeenCalledTimes(2);
        expect(initClient).toHaveBeenNthCalledWith(1, clients[0]);
        expect(initClient).toHaveBeenNthCalledWith(2, clients[1]);
        expect(maintainWatcherCache).toHaveBeenCalledTimes(1);
    });

    it('register() legt Eintrag an (default state=send) und persisted', () => {
        const watcher = wsAutoWatcher();

        const payload = { id: 'm1', foo: 1 };
        watcher.register('wss://x', payload);

        const entry = (watcherCache as Map<string, any>).get('m1');
        expect(entry).toMatchObject({
            id: 'm1',
            url: 'wss://x',
            payload,
            state: 'send',
        });
        expect(typeof entry.timestamp).toBe('number');
        expect(writeWatcherCache).toHaveBeenCalledTimes(1);
    });

    it('register() ignoriert payload ohne id', () => {
        const watcher = wsAutoWatcher();
        watcher.register('wss://x', { foo: 1 } as any);
        expect((watcherCache as Map<string, any>).size).toBe(0);
        expect(writeWatcherCache).not.toHaveBeenCalled();
    });

    it('update() merged existierenden Eintrag (kein success/error) – (Hinweis: persist fehlt aktuell)', () => {
        const watcher = wsAutoWatcher();
        watcher.register('wss://x', { id: 'm2' });

        watcher.update({ id: 'm2', state: 'pending', payload: { a: 1 } });

        const entry = (watcherCache as Map<string, any>).get('m2');
        expect(entry.state).toBe('pending');
        expect(entry.payload).toEqual({ a: 1 });

        expect(writeWatcherCache).toHaveBeenCalledTimes(2);
    });

    it('update() bei success/error → unregister()', () => {
        const watcher = wsAutoWatcher();
        watcher.register('wss://x', { id: 'm3' });

        watcher.update({ id: 'm3', state: 'success' });

        expect((watcherCache as Map<string, any>).has('m3')).toBe(false);
        // register + unregister → 2 Writes
        expect(writeWatcherCache).toHaveBeenCalledTimes(2);
    });

    it('update() ignoriert unbekannte id', () => {
        const watcher = wsAutoWatcher();
        watcher.update({ id: 'unknown', state: 'pending' });
        expect(writeWatcherCache).not.toHaveBeenCalled();
    });

    it('unregister() löscht und persisted', () => {
        const watcher = wsAutoWatcher();
        watcher.register('wss://x', { id: 'm4' });

        watcher.unregister('m4');

        expect((watcherCache as Map<string, any>).has('m4')).toBe(false);
        expect(writeWatcherCache).toHaveBeenCalledTimes(2); // register + unregister
    });

    it('list() gibt Werte als Array zurück', () => {
        const watcher = wsAutoWatcher();
        watcher.register('wss://x', { id: 'a' });
        watcher.register('wss://y', { id: 'b' });

        const list = watcher.list();
        expect(Array.isArray(list)).toBe(true);
        expect(list.map((m) => m.id).sort()).toEqual(['a', 'b']);
    });

    it('clear() leert Cache und entfernt Storage-Key', () => {
        const watcher = wsAutoWatcher();
        watcher.register('wss://x', { id: 'a' });

        watcher.clear();

        expect((watcherCache as Map<string, any>).size).toBe(0);
        expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('WS_WATCH_KEY');
    });
});