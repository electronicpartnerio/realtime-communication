/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleDownload } from './handleDownload';
import { triggerDownload } from '../util/triggerDownload';
import { guessFilename } from '../util/guessFilename';

vi.mock('../util/triggerDownload', () => ({
    triggerDownload: vi.fn(),
}));

vi.mock('../util/guessFilename', () => ({
    guessFilename: vi.fn((filename?: string, url?: string) => filename || 'default.txt'),
}));

describe('handleDownload (happy-dom)', () => {
    const originalFetch = globalThis.fetch;
    const mockCreateObjectURL = vi.fn(() => 'blob://mock');

    beforeEach(() => {
        vi.resetAllMocks();
        globalThis.URL.createObjectURL = mockCreateObjectURL as any;
        globalThis.fetch = vi.fn(async () => ({
            blob: async () => new Blob(['data'], { type: 'text/plain' }),
        })) as any;
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
    });

    it('downloads via direct link when input.url exists (no forceFetch)', async () => {
        const input = { url: 'https://example.com/file.txt', filename: 'demo.txt' };
        await handleDownload(input);

        expect(guessFilename).toHaveBeenCalledWith('demo.txt', 'https://example.com/file.txt');
        expect(triggerDownload).toHaveBeenCalledWith('https://example.com/file.txt', 'demo.txt', false);
    });

    it('downloads via fetch + blob when forceFetch=true', async () => {
        const input = {
            url: 'https://example.com/protected.txt',
            filename: 'secure.txt',
            forceFetch: true,
        };

        await handleDownload(input);

        expect(fetch).toHaveBeenCalledWith('https://example.com/protected.txt', {
            credentials: 'include',
        });
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(triggerDownload).toHaveBeenCalledWith('blob://mock', 'secure.txt');
    });

    it('falls back to direct link if fetch throws', async () => {
        (fetch as any).mockRejectedValueOnce(new Error('network error'));

        const input = { url: 'https://example.com/fallback.txt', filename: 'fb.txt', forceFetch: true };
        await handleDownload(input);

        expect(triggerDownload).toHaveBeenCalledWith('https://example.com/fallback.txt', 'fb.txt', false);
    });

    it('handles base64 input', async () => {
        const base64 = btoa('Hello!');
        const input = { base64, mime: 'text/plain', filename: 'hello.txt' };

        await handleDownload(input);

        expect(triggerDownload).toHaveBeenCalledWith('blob://mock', 'hello.txt');
        expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it('handles content input (string)', async () => {
        const input = { content: 'abc', mime: 'text/plain', filename: 'x.txt' };

        await handleDownload(input);

        expect(triggerDownload).toHaveBeenCalledWith('blob://mock', 'x.txt');
    });

    it('handles content input (Uint8Array)', async () => {
        const arr = new Uint8Array([1, 2, 3]);
        const input = { content: arr, mime: 'application/octet-stream', filename: 'bin.bin' };

        await handleDownload(input);

        expect(triggerDownload).toHaveBeenCalledWith('blob://mock', 'bin.bin');
    });
});