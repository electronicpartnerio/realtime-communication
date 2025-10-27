/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { hideToast } from './hideToast';
import { toast } from '../../cache';
import { TOAST_ID_PREFIX } from '../../constant';

vi.mock('../../cache', () => ({
    toast: { hide: vi.fn() },
}));

describe('hideToast', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('ruft toast.hide() mit korrektem ID-Prefix auf', () => {
        hideToast('abc123');
        expect(toast.hide).toHaveBeenCalledWith(`${TOAST_ID_PREFIX}abc123`);
    });

    it('wirft keinen Fehler, wenn kein Element im DOM existiert', () => {
        expect(() => hideToast('nonexistent')).not.toThrow();
        expect(toast.hide).toHaveBeenCalledWith(`${TOAST_ID_PREFIX}nonexistent`);
    });
});