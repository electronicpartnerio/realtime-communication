/**
 * @vitest-environment happy-dom
 */
import { cryptoRandomId } from './cryptoRandomId';

describe('cryptoRandomId', () => {
    const originalDesc = Object.getOwnPropertyDescriptor(globalThis, 'crypto');

    const setCrypto = (value: any) => {
        Object.defineProperty(globalThis, 'crypto', {
            configurable: true,
            enumerable: true,
            value,
        });
    };

    afterEach(() => {
        if (originalDesc) {
            Object.defineProperty(globalThis, 'crypto', originalDesc);
        } else {
            // @ts-ignore
            delete globalThis.crypto;
        }
    });

    it('calls crypto.randomUUID() when available', () => {
        const spy = vi.fn(() => 'mocked-uuid');
        setCrypto({ randomUUID: spy });

        const result = cryptoRandomId();
        expect(spy).toHaveBeenCalledTimes(1);
        expect(result).toBe('mocked-uuid');
    });

    it('falls back to Math.random when crypto is missing', () => {
        // @ts-ignore
        setCrypto(undefined);

        const result = cryptoRandomId();
        expect(result.startsWith('id_')).toBe(true);
    });

    it('falls back to Math.random when crypto has no randomUUID', () => {
        setCrypto({});
        const result = cryptoRandomId();
        expect(result.startsWith('id_')).toBe(true);
    });
});