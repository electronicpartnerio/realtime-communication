/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePending } from './handlePending';
import { showToast } from '../util/showToast';

vi.mock('../util/showToast', () => ({
    showToast: vi.fn(() => Promise.resolve()),
}));

describe('handlePending', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('ruft showToast mit "info", id und toast-Text auf', async () => {
        const input = { id: '123', toast: 'download.starting' };

        await handlePending(input as any);

        expect(showToast).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith('info', '123', 'download.starting');
    });

    it('funktioniert auch, wenn kein Toast übergeben wird', async () => {
        const input = { id: 'abc' };

        await handlePending(input as any);

        expect(showToast).toHaveBeenCalledWith('info', 'abc', undefined);
    });
});