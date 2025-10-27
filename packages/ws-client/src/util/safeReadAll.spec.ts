import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeReadAll } from './safeReadAll';
import { WS_REGISTRY_KEY } from '../constant';

describe('safeReadAll', () => {
    const originalWindow = globalThis.window;
    const mockGetItem = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();
        const mockGetItem = vi.fn();
        const storage = { getItem: mockGetItem };

        (globalThis as any).window = { sessionStorage: storage } as any;
        (globalThis as any).sessionStorage = storage; // 👈 Alias für unqualifizierten Zugriff

        // falls du mockGetItem außerhalb brauchst, exportiere/refaktoriere entsprechend
        (globalThis as any).__mockGetItem = mockGetItem;
    });

    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('returns empty object when sessionStorage is missing', () => {
        // @ts-ignore
        globalThis.window = {};
        expect(safeReadAll()).toEqual({});
    });

    it('returns empty object when registry key not found', () => {
        mockGetItem.mockReturnValueOnce(null);
        expect(safeReadAll()).toEqual({});
    });

    it('parses valid JSON and returns object', () => {
        const data = { test: { url: 'wss://demo' } };
        const mockGetItem = (globalThis as any).__mockGetItem as ReturnType<typeof vi.fn>;
        mockGetItem.mockReturnValueOnce(JSON.stringify(data));

        const result = safeReadAll();
        expect(result).toEqual(data);
        expect(mockGetItem).toHaveBeenCalledWith(WS_REGISTRY_KEY);
    });

    it('returns {} when JSON.parse fails', () => {
        mockGetItem.mockReturnValueOnce('{invalid json}');
        expect(safeReadAll()).toEqual({});
    });

    it('returns {} when parsed data is not an object', () => {
        mockGetItem.mockReturnValueOnce('"string"');
        expect(safeReadAll()).toEqual({});
        mockGetItem.mockReturnValueOnce('123');
        expect(safeReadAll()).toEqual({});
    });
});