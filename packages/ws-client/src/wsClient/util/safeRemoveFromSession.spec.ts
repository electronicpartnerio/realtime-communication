// safeRemoveFromSession.spec.ts
/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeRemoveFromSession } from './safeRemoveFromSession';
import { safeReadAll } from '../../util/safeReadAll';
import { WS_REGISTRY_KEY } from '../../constant';

vi.mock('../../util/safeReadAll', () => ({
    safeReadAll: vi.fn(),
}));

describe('safeRemoveFromSession', () => {
    const mockSetItem = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        Object.defineProperty(window, 'sessionStorage', {
            value: { setItem: mockSetItem },
            writable: true,
        });
    });

    it('entfernt vorhandenen Key und schreibt aktualisierten Zustand', () => {
        (safeReadAll as vi.Mock).mockReturnValueOnce({
            keep: { url: 'wss://keep' },
            drop: { url: 'wss://drop' },
        });

        safeRemoveFromSession('drop');

        expect(mockSetItem).toHaveBeenCalledTimes(1);
        const [key, value] = mockSetItem.mock.calls[0];
        expect(key).toBe(WS_REGISTRY_KEY);
        expect(JSON.parse(value)).toEqual({
            keep: { url: 'wss://keep' },
        });
    });

    it('macht nichts (kein setItem), wenn Key nicht existiert', () => {
        (safeReadAll as vi.Mock).mockReturnValueOnce({
            only: { url: 'wss://only' },
        });

        safeRemoveFromSession('missing');

        expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('wirft nicht, wenn sessionStorage nicht existiert', () => {
        Object.defineProperty(window, 'sessionStorage', { value: undefined });
        expect(() => safeRemoveFromSession('any')).not.toThrow();
    });

    it('wirft nicht bei Exceptions in setItem', () => {
        (safeReadAll as vi.Mock).mockReturnValueOnce({ drop: { url: 'x' } });
        mockSetItem.mockImplementationOnce(() => {
            throw new Error('quota exceeded');
        });

        expect(() => safeRemoveFromSession('drop')).not.toThrow();
    });
});