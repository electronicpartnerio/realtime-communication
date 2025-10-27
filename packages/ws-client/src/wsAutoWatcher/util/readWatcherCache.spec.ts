/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readWatcherCache } from './readWatcherCache';
import { watcherCache } from '../../cache';
import { WS_WATCH_KEY } from '../../constant';

vi.mock('../../cache', () => ({
    watcherCache: new Map<string, any>(),
}));

describe('readWatcherCache', () => {
    const mockGetItem = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        (watcherCache as Map<string, any>).clear();
        Object.defineProperty(window, 'sessionStorage', {
            value: { getItem: mockGetItem },
            writable: true,
        });
    });

    it('füllt watcherCache mit gültigen Einträgen', () => {
        const data = {
            a: { id: 'a', state: 'pending', payload: {}, timestamp: 123 },
            b: { id: 'b', state: 'success', payload: {}, timestamp: 456 },
        };
        mockGetItem.mockReturnValueOnce(JSON.stringify(data));

        readWatcherCache();

        expect(mockGetItem).toHaveBeenCalledWith(WS_WATCH_KEY);
        expect((watcherCache as Map<string, any>).size).toBe(2);
        expect(watcherCache.get('a')).toEqual(data.a);
        expect(watcherCache.get('b')).toEqual(data.b);
    });

    it('macht nichts, wenn sessionStorage leer ist', () => {
        mockGetItem.mockReturnValueOnce(null);

        readWatcherCache();

        expect((watcherCache as Map<string, any>).size).toBe(0);
    });

    it('ignoriert ungültiges JSON ohne Exception', () => {
        mockGetItem.mockReturnValueOnce('{invalid-json');

        expect(() => readWatcherCache()).not.toThrow();
        expect((watcherCache as Map<string, any>).size).toBe(0);
    });

    it('füllt keine Einträge, wenn parsed kein Objekt ist', () => {
        mockGetItem.mockReturnValueOnce('"not-an-object"');
        readWatcherCache();

        expect((watcherCache as Map<string, any>).size).toBe(0);
    });
});