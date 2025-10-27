/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleError } from './handleError';
import { showToast } from '../util/showToast';
import { hideToast } from '../util/hideToast';
import { removeMessage } from '../util/removeMessage';

vi.mock('../util/showToast', () => ({
    showToast: vi.fn(() => Promise.resolve()),
}));
vi.mock('../util/hideToast', () => ({
    hideToast: vi.fn(),
}));
vi.mock('../util/removeMessage', () => ({
    removeMessage: vi.fn(),
}));

describe('handleError', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('ruft hideToast, showToast und removeMessage in korrekter Reihenfolge auf', async () => {
        const input = { id: 'abc123', toast: 'error.happened' };

        await handleError(input as any);

        expect(hideToast).toHaveBeenCalledWith('abc123');
        expect(showToast).toHaveBeenCalledWith('danger', 'abc123', 'error.happened');
        expect(removeMessage).toHaveBeenCalledWith('abc123');

        // Reihenfolge prüfen – hideToast zuerst, removeMessage zuletzt
        const calls = [
            (hideToast as vi.Mock).mock.invocationCallOrder[0],
            (showToast as vi.Mock).mock.invocationCallOrder[0],
            (removeMessage as vi.Mock).mock.invocationCallOrder[0],
        ];
        expect(calls[0]).toBeLessThan(calls[1]);
        expect(calls[1]).toBeLessThan(calls[2]);
    });

    it('funktioniert auch, wenn toast undefined ist', async () => {
        const input = { id: 'xyz789' };
        await handleError(input as any);

        expect(showToast).toHaveBeenCalledWith('danger', 'xyz789', undefined);
        expect(hideToast).toHaveBeenCalledWith('xyz789');
        expect(removeMessage).toHaveBeenCalledWith('xyz789');
    });
});