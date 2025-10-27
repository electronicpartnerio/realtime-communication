/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { showToast } from './showToast';
import { translateSafe } from './translateSafe';
import { toast } from '../../cache';
import { TOAST_ID_PREFIX } from '../../constant';

vi.mock('./translateSafe', () => ({
    translateSafe: vi.fn(),
}));

vi.mock('../../cache', () => ({
    toast: { add: vi.fn() },
}));

describe('showToast', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (translateSafe as vi.Mock).mockResolvedValue('translated.message');
    });

    it('übersetzt msg und ruft toast.add() mit korrektem Prefix auf', async () => {
        await showToast('success', 'abc', 'toast.key');

        expect(translateSafe).toHaveBeenCalledWith('toast.key');
        expect(toast.add).toHaveBeenCalledWith(
            'translated.message',
            'success',
            `${TOAST_ID_PREFIX}abc`
        );
    });

    it('führt keinen Toast aus, wenn msg fehlt', async () => {
        await showToast('info', 'xyz');
        expect(translateSafe).not.toHaveBeenCalled();
        expect(toast.add).not.toHaveBeenCalled();
    });

    it('funktioniert korrekt mit anderem Appearance-Typ', async () => {
        (translateSafe as vi.Mock).mockResolvedValueOnce('alert.message');

        await showToast('danger', 'id999', 'error.key');

        expect(toast.add).toHaveBeenCalledWith(
            'alert.message',
            'danger',
            `${TOAST_ID_PREFIX}id999`
        );
    });
});