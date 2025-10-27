// updateMessageState.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateMessageState } from './updateMessageState';

vi.mock('../../cache', () => ({
    watcherCache: new Map<string, any>(),
}));

vi.mock('./writeWatcherCache', () => ({
    writeWatcherCache: vi.fn(),
}));

import { watcherCache } from '../../cache';
import { writeWatcherCache } from './writeWatcherCache';

describe('updateMessageState', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (watcherCache as Map<string, any>).clear();
    });

    it('macht nichts, wenn die ID nicht existiert', () => {
        updateMessageState('missing', 'pending');
        expect(writeWatcherCache).not.toHaveBeenCalled();
        expect((watcherCache as Map<string, any>).size).toBe(0);
    });

    it('aktualisiert den State und schreibt den Cache', () => {
        const entry = { id: 'a1', state: 'send', url: 'wss://x', payload: { foo: 1 }, timestamp: 123 };
        watcherCache.set('a1', entry);

        updateMessageState('a1', 'pending');

        const updated = watcherCache.get('a1');
        expect(updated).toBeDefined();
        expect(updated!.state).toBe('pending');
        // andere Felder bleiben erhalten
        expect(updated!.url).toBe('wss://x');
        expect(updated!.payload).toEqual({ foo: 1 });
        expect(updated!.timestamp).toBe(123);

        expect(writeWatcherCache).toHaveBeenCalledTimes(1);
    });

    it('überschreibt den Eintrag im Map erneut (set wird aufgerufen)', () => {
        const setSpy = vi.spyOn(watcherCache, 'set');
        watcherCache.set('id2', { id: 'id2', state: 'send', payload: {}, timestamp: 1 });

        updateMessageState('id2', 'success');

        expect(setSpy).toHaveBeenCalledWith('id2', expect.objectContaining({ state: 'success' }));
        expect(writeWatcherCache).toHaveBeenCalledTimes(1);
    });
});