/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safePersistToSession } from './safePersistToSession';
import { safeReadAll } from '../../util/safeReadAll';
import { WS_REGISTRY_KEY } from '../../constant';

vi.mock('../../util/safeReadAll', () => ({
    safeReadAll: vi.fn(),
}));

describe('safePersistToSession', () => {
    const mockSetItem = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        Object.defineProperty(window, 'sessionStorage', {
            value: { setItem: mockSetItem },
            writable: true,
        });
    });

    it('fügt neuen Eintrag in bestehenden Storage hinzu', () => {
        (safeReadAll as vi.Mock).mockReturnValueOnce({
            existing: { url: 'wss://demo' },
        });

        const entry = { url: 'wss://new', authToken: 'abc' };
        safePersistToSession('newKey', entry);

        expect(safeReadAll).toHaveBeenCalled();
        expect(mockSetItem).toHaveBeenCalledTimes(1);
        const [key, value] = mockSetItem.mock.calls[0];
        expect(key).toBe(WS_REGISTRY_KEY);
        expect(JSON.parse(value)).toEqual({
            existing: { url: 'wss://demo' },
            newKey: { url: 'wss://new', authToken: 'abc' },
        });
    });

    it('überschreibt bestehenden Key, wenn bereits vorhanden', () => {
        (safeReadAll as vi.Mock).mockReturnValueOnce({
            newKey: { url: 'wss://old' },
        });

        const entry = { url: 'wss://updated' };
        safePersistToSession('newKey', entry);

        const [_key, value] = mockSetItem.mock.calls[0];
        expect(JSON.parse(value)).toEqual({
            newKey: { url: 'wss://updated' },
        });
    });

    it('macht nichts, wenn sessionStorage nicht existiert', () => {
        Object.defineProperty(window, 'sessionStorage', { value: undefined });
        expect(() => safePersistToSession('a', { url: 'x' } as any)).not.toThrow();
    });

    it('wirft keine Fehler bei Exceptions', () => {
        (safeReadAll as vi.Mock).mockReturnValueOnce({});
        mockSetItem.mockImplementationOnce(() => {
            throw new Error('Quota exceeded');
        });

        expect(() =>
            safePersistToSession('x', { url: 'demo' } as any)
        ).not.toThrow();
    });
});