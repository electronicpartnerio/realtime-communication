/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from 'vitest';
import { guessFilename } from './guessFilename';

describe('guessFilename', () => {
    it('gibt filename zurück, wenn übergeben', () => {
        const result = guessFilename('custom.txt', 'https://example.com/file.csv');
        expect(result).toBe('custom.txt');
    });

    it('extrahiert den letzten Pfadteil aus der URL', () => {
        const result = guessFilename(undefined, 'https://example.com/files/demo.csv');
        expect(result).toBe('demo.csv');
    });

    it('ignoriert leeren Pfad und gibt Fallback zurück', () => {
        const fakeNow = 1730000000000;
        vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

        const result = guessFilename(undefined, 'https://example.com/');
        expect(result).toBe(`example.com`);
    });

    it('gibt Fallback zurück, wenn keine URL oder filename übergeben wurde', () => {
        const fakeNow = 1730000000000;
        vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

        const result = guessFilename();
        expect(result).toBe(`download-${fakeNow}`);
    });

    it('gibt Fallback zurück, wenn URL ungültig ist', () => {
        const fakeNow = 1730000000000;
        vi.spyOn(Date, 'now').mockReturnValue(fakeNow);

        const result = guessFilename(undefined, 'ht!tp://any name');
        expect(result).toBe(`any name`);
    });
});