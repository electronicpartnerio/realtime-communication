import { describe, it, expect } from 'vitest';
import { safeParse } from './safeParse';

describe('safeParse', () => {
    it('parst gültiges JSON und gibt das Objekt zurück', () => {
        const input = '{"a":1,"b":"x"}';
        const result = safeParse<{ a: number; b: string }>(input);
        expect(result).toEqual({ a: 1, b: 'x' });
    });

    it('gibt null zurück, wenn Eingabe kein String ist', () => {
        expect(safeParse(123)).toBeNull();
        expect(safeParse({})).toBeNull();
        expect(safeParse(undefined)).toBeNull();
        expect(safeParse(null)).toBeNull();
        expect(safeParse(true)).toBeNull();
    });

    it('gibt null zurück, wenn JSON ungültig ist', () => {
        const badJSON = '{"a":1,}';
        const result = safeParse(badJSON);
        expect(result).toBeNull();
    });

    it('funktioniert auch mit Arrays', () => {
        const arrJSON = '[1,2,3]';
        const result = safeParse<number[]>(arrJSON);
        expect(result).toEqual([1, 2, 3]);
    });

    it('funktioniert auch mit Strings in Quotes', () => {
        const strJSON = '"hello"';
        const result = safeParse<string>(strJSON);
        expect(result).toBe('hello');
    });
});