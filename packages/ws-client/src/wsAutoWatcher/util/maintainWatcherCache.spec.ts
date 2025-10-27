/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { maintainWatcherCache } from './maintainWatcherCache';

// Mocks
vi.mock('../../cache', () => ({
    watcherCache: new Map<string, any>(),
}));

vi.mock('./removeMessage', () => ({
    removeMessage: vi.fn(),
}));

vi.mock('../handler/handlePending', () => ({
    handlePending: vi.fn(() => Promise.resolve()),
}));

// SESSION_LIFETIME kontrollieren
vi.mock('../../constant', () => ({
    SESSION_LIFETIME: 1000, // 1s für den Test
}));

import { watcherCache } from '../../cache';
import { removeMessage } from './removeMessage';
import { handlePending } from '../handler/handlePending';

describe('maintainWatcherCache', () => {
    const NOW = 1_730_000_000_000; // Fixe Zeit

    beforeEach(() => {
        vi.resetAllMocks();
        (watcherCache as Map<string, any>).clear();
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
    });

    it('entfernt Einträge, die älter als SESSION_LIFETIME sind', async () => {
        watcherCache.set('old', {
            id: 'old',
            state: 'pending',
            payload: { toastPending: 'pending.old' },
            timestamp: NOW - 1000 - 1, // älter als LIFETIME
        });

        maintainWatcherCache();

        expect(removeMessage).toHaveBeenCalledWith('old');
        expect(handlePending).not.toHaveBeenCalled();
    });

    it('entfernt Einträge mit state=success', () => {
        watcherCache.set('ok', {
            id: 'ok',
            state: 'success',
            payload: {},
            timestamp: NOW,
        });

        maintainWatcherCache();

        expect(removeMessage).toHaveBeenCalledWith('ok');
    });

    it('entfernt Einträge mit state=error', () => {
        watcherCache.set('fail', {
            id: 'fail',
            state: 'error',
            payload: {},
            timestamp: NOW,
        });

        maintainWatcherCache();

        expect(removeMessage).toHaveBeenCalledWith('fail');
    });

    it('ruft bei pending (nicht abgelaufen) handlePending mit Toast auf', async () => {
        watcherCache.set('pend', {
            id: 'pend',
            state: 'pending',
            payload: { toastPending: 'download.starting' },
            timestamp: NOW - 500, // innerhalb LIFETIME
        });

        maintainWatcherCache();
        // einmal microtask abwarten, da handler async ist
        await Promise.resolve();

        expect(removeMessage).not.toHaveBeenCalled();
        expect(handlePending).toHaveBeenCalledWith({ id: 'pend', toast: 'download.starting' });
    });

    it('macht nichts bei unbekanntem/nicht-pending state innerhalb der LIFETIME', () => {
        watcherCache.set('send', {
            id: 'send',
            state: 'send',
            payload: { toastPending: 'ignored' },
            timestamp: NOW - 100, // frisch
        });

        maintainWatcherCache();

        expect(removeMessage).not.toHaveBeenCalled();
        expect(handlePending).not.toHaveBeenCalled();
    });

    it('löscht nicht, wenn genau gleich SESSION_LIFETIME (Grenzfall) und ruft bei pending den Toast', async () => {
        watcherCache.set('edge', {
            id: 'edge',
            state: 'pending',
            payload: { toastPending: 'edge.toast' },
            timestamp: NOW - 1000, // == SESSION_LIFETIME
        });

        maintainWatcherCache();
        await Promise.resolve();

        expect(removeMessage).not.toHaveBeenCalled(); // > LIFETIME wäre nötig, nicht >=
        expect(handlePending).toHaveBeenCalledWith({ id: 'edge', toast: 'edge.toast' });
    });
});