/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { removeMessage } from './removeMessage';
import { watcherCache } from '../../cache';
import { writeWatcherCache } from './writeWatcherCache';

vi.mock('../../cache', () => ({
    watcherCache: new Map<string, any>(),
}));

vi.mock('./writeWatcherCache', () => ({
    writeWatcherCache: vi.fn(),
}));

describe('removeMessage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (watcherCache as Map<string, any>).clear();
    });

    it('löscht Eintrag aus watcherCache und schreibt Cache neu', () => {
        watcherCache.set('abc', { id: 'abc', state: 'pending' });

        removeMessage('abc');

        expect((watcherCache as Map<string, any>).has('abc')).toBe(false);
        expect(writeWatcherCache).toHaveBeenCalledTimes(1);
    });

    it('ruft writeWatcherCache auch auf, wenn ID nicht existiert', () => {
        removeMessage('missing');
        expect(writeWatcherCache).toHaveBeenCalledTimes(1);
    });
});