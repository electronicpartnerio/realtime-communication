/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleAlert } from './handleAlert';
import { translateSafe } from '../util/translateSafe';

vi.mock('../util/translateSafe', () => ({
    translateSafe: vi.fn(),
}));

describe('handleAlert', () => {
    const mockAlert = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        globalThis.alert = mockAlert;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('ruft alert() mit übersetztem Text auf, wenn translateSafe einen String liefert', async () => {
        (translateSafe as vi.Mock).mockResolvedValueOnce('Hello World');
        await handleAlert('some.message.key');
        expect(translateSafe).toHaveBeenCalledWith('some.message.key');
        expect(mockAlert).toHaveBeenCalledWith('Hello World');
    });

    it('ruft kein alert() auf, wenn translateSafe null/undefined liefert', async () => {
        (translateSafe as vi.Mock).mockResolvedValueOnce(undefined);
        await handleAlert('no.translation');
        expect(mockAlert).not.toHaveBeenCalled();

        (translateSafe as vi.Mock).mockResolvedValueOnce(null);
        await handleAlert('also.no.translation');
        expect(mockAlert).not.toHaveBeenCalled();
    });
});