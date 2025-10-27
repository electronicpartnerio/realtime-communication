/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './normalizeUrl';

describe('normalizeUrl', () => {
    it('hängt token an, wenn appendAuth=true und kein token vorhanden', () => {
        const result = normalizeUrl('https://example.com/path', 'abc123', true);
        expect(result).toBe('https://example.com/path?token=abc123');
    });

    it('hängt keinen token an, wenn appendAuth=false', () => {
        const result = normalizeUrl('https://example.com/path', 'abc123', false);
        expect(result).toBe('https://example.com/path');
    });

    it('überschreibt vorhandenen token nicht', () => {
        const result = normalizeUrl('https://example.com/path?token=xyz', 'abc123', true);
        expect(result).toBe('https://example.com/path?token=xyz');
    });

    it('entfernt doppelte Slashes im Pfad (außer nach https:)', () => {
        const result = normalizeUrl('https://example.com//api//v1', 'tok');
        // kein "//" nach https:, aber ein "/" im Pfad erlaubt
        expect(result).toBe('https://example.com/api/v1?token=tok');
    });

    it('funktioniert korrekt ohne authToken', () => {
        const result = normalizeUrl('https://example.com/demo');
        expect(result).toBe('https://example.com/demo');
    });

    it('behält Query-Parameter bei, wenn bereits vorhanden', () => {
        const result = normalizeUrl('https://api.test.com/x?foo=bar', 'tok');
        expect(result).toBe('https://api.test.com/x?foo=bar&token=tok');
    });
});