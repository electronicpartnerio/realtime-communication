/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateSafe } from './translateSafe';
import { TOAST_MSG_PREFIX } from '../../constant';
import { t } from '@electronicpartnerio/ep-lit-translate';

vi.mock('@electronicpartnerio/ep-lit-translate', () => ({
    t: { g: vi.fn() },
}));

describe('translateSafe', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('gibt "no message" zurück, wenn msg fehlt', async () => {
        const result = await translateSafe(undefined);
        expect(result).toBe('no message');
        expect(t.g).not.toHaveBeenCalled();
    });

    it('gibt msg direkt zurück, wenn sie nicht mit Prefix startet', async () => {
        const result = await translateSafe('simple.text');
        expect(result).toBe('simple.text');
        expect(t.g).not.toHaveBeenCalled();
    });

    it('ruft t.g auf, wenn msg mit Prefix startet', async () => {
        (t.g as vi.Mock).mockResolvedValueOnce('übersetzt.text');
        const key = `${TOAST_MSG_PREFIX}download.ready`;

        const result = await translateSafe(key);

        expect(t.g).toHaveBeenCalledWith(key);
        expect(result).toBe('übersetzt.text');
    });

    it('gibt async-Result korrekt weiter, wenn t.g resolved', async () => {
        (t.g as vi.Mock).mockResolvedValueOnce('translated');
        const result = await translateSafe(`${TOAST_MSG_PREFIX}alert.error`);
        expect(result).toBe('translated');
    });
});