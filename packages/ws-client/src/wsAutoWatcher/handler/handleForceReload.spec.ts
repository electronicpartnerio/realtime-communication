/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleForceReload } from './handleForceReload';
import { translateSafe } from '../util/translateSafe';

vi.mock('../util/translateSafe', () => ({
    translateSafe: vi.fn(),
}));

describe('handleForceReload', () => {
    const mockConfirm = vi.fn();
    const mockReload = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        (translateSafe as vi.Mock).mockResolvedValue('reload.now');
        globalThis.confirm = mockConfirm;
        Object.defineProperty(window, 'location', {
            value: { reload: mockReload },
            writable: true,
        });
    });

    it('ruft translateSafe mit der übergebenen Message auf', async () => {
        await handleForceReload('reload.confirm');
        expect(translateSafe).toHaveBeenCalledWith('reload.confirm');
    });

    it('ruft location.reload() wenn confirm true zurückgibt', async () => {
        mockConfirm.mockReturnValueOnce(true);
        await handleForceReload('reload.confirm');
        expect(mockConfirm).toHaveBeenCalledWith('reload.now');
        expect(mockReload).toHaveBeenCalled();
    });

    it('ruft kein reload() wenn confirm false zurückgibt', async () => {
        mockConfirm.mockReturnValueOnce(false);
        await handleForceReload('reload.confirm');
        expect(mockReload).not.toHaveBeenCalled();
    });

    it('funktioniert auch, wenn keine confirmMsg übergeben wird', async () => {
        (translateSafe as vi.Mock).mockResolvedValueOnce(undefined);
        mockConfirm.mockReturnValueOnce(true);
        await handleForceReload();
        expect(mockConfirm).toHaveBeenCalledWith(undefined);
        expect(mockReload).toHaveBeenCalled();
    });
});