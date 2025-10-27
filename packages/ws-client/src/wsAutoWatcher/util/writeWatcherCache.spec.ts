// writeWatcherCache.spec.ts
/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeWatcherCache } from './writeWatcherCache';
import { watcherCache } from '../../cache';
import { WS_WATCH_KEY } from '../../constant';

vi.mock('../../cache', () => ({
    watcherCache: new Map<string, any>(),
}));

describe('writeWatcherCache', () => {
    const mockSetItem = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (watcherCache as Map<string, any>).clear();

        Object.defineProperty(window, 'sessionStorage', {
            value: { setItem: mockSetItem },
            writable: true,
        });
    });

    it('serialisiert watcherCache und speichert in sessionStorage', () => {
        watcherCache.set('1', { id: '1', state: 'pending', payload: {}, timestamp: 1 });
        watcherCache.set('2', { id: '2', state: 'success', payload: {}, timestamp: 2 });

        writeWatcherCache();

        expect(mockSetItem).toHaveBeenCalledTimes(1);
        const [key, value] = mockSetItem.mock.calls[0];
        expect(key).toBe(WS_WATCH_KEY);
        expect(JSON.parse(value)).toEqual({
            '1': { id: '1', state: 'pending', payload: {}, timestamp: 1 },
            '2': { id: '2', state: 'success', payload: {}, timestamp: 2 },
        });
    });

    it('funktioniert mit leerem Cache', () => {
        writeWatcherCache();
        expect(mockSetItem).toHaveBeenCalledWith(WS_WATCH_KEY, '{}');
    });

    it('wirft keine Fehler bei Exceptions', () => {
        mockSetItem.mockImplementationOnce(() => {
            throw new Error('Storage full');
        });
        watcherCache.set('x', { id: 'x', state: 'send', payload: {}, timestamp: 9 });
        expect(() => writeWatcherCache()).not.toThrow();
    });
});