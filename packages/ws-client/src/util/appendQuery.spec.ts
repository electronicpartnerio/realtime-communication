/**
 * @vitest-environment happy-dom
 */
import { appendQuery } from './appendQuery';

const qs = (url: string) => Object.fromEntries(new URL(url).searchParams.entries());

const defineWindowLocation = (href: string) => {
    // location ist normalerweise read-only; hier neu definieren
    Object.defineProperty(window, 'location', {
        value: new URL(href),
        configurable: true,
    });
};

const originalLocation = window.location;

describe('appendQuery', () => {
    beforeEach(() => {
        defineWindowLocation('https://base.example.com/app/index.html#frag');
    });

    afterEach(() => {
        // restore original window.location
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            configurable: true,
        });
    });

    it('appends params to an absolute URL', () => {
        const out = appendQuery('https://api.example.com/v1/resource', {
            a: 'x',
            b: 123,
            c: true,
        });
        expect(new URL(out).origin).toBe('https://api.example.com');
        expect(qs(out)).toEqual({ a: 'x', b: '123', c: 'true' });
    });

    it('merges with existing query and overrides same keys', () => {
        const out = appendQuery('https://api.example.com/v1/resource?b=old&keep=z', {
            a: 'x',
            b: 42, // override
        });
        expect(qs(out)).toEqual({ keep: 'z', a: 'x', b: '42' });
    });

    it('uses window.location.href as base for relative URLs', () => {
        const out = appendQuery('/relative/path', { q: 'ok' });
        const u = new URL(out);
        expect(u.origin).toBe('https://base.example.com');
        expect(u.pathname).toBe('/relative/path');
        expect(qs(out)).toEqual({ q: 'ok' });
        // Hash aus der Base-URL sollte NICHT automatisch übernommen werden (neue URL ohne Hash)
        expect(u.hash).toBe('');
    });

    it('keeps hash of the provided absolute URL intact', () => {
        const out = appendQuery('https://x.y/z#top', { p: '1' });
        const u = new URL(out);
        expect(u.hash).toBe('#top');
        expect(qs(out)).toEqual({ p: '1' });
    });

    it('ignores undefined/null values and coerces others to strings', () => {
        // @ts-expect-error: null ist nicht im Typ, wird aber in der Implementierung gefiltert
        const out = appendQuery('https://x.y/z', { a: undefined, b: null, c: 0, d: false, e: '' });
        expect(qs(out)).toEqual({ c: '0', d: 'false', e: '' });
    });

    it('URL-encodes values correctly', () => {
        const out = appendQuery('https://x.y/z', { q: 'a b&c=d/ü' });
        // nicht auf gesamte URL string-matchen (Encoding kann Reihenfolge haben) – wir prüfen Param
        expect(qs(out)).toEqual({ q: 'a b&c=d/ü' }); // URLSearchParams decodiert automatisch
    });

    it('returns the same URL when params is empty', () => {
        const input = 'https://x.y/z?keep=1';
        const out = appendQuery(input, {});
        // Normalisierung (z. B. trailing slash) könnte variieren, daher über Params prüfen
        expect(qs(out)).toEqual({ keep: '1' });
        const uIn = new URL(input);
        const uOut = new URL(out);
        expect(uOut.origin).toBe(uIn.origin);
        expect(uOut.pathname).toBe(uIn.pathname);
        expect(uOut.hash).toBe(uIn.hash);
    });
});