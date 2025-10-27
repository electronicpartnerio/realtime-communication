// restoreWsFromSession.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 👇 Modul unter Test
import { restoreWsFromSession } from './restoreWsFromSession';

// 👇 Abhängigkeiten mocken – Pfade wie im Modul!
vi.mock('../wsClient', () => ({
    wsClient: vi.fn(),
}));
vi.mock('./safeReadAll', () => ({
    safeReadAll: vi.fn(),
}));

// Typ-Hilfen aus den Mocks ziehen
import { wsClient } from '../wsClient';
import { safeReadAll } from './safeReadAll';

class FakeWS {} // nur als Marker für wsImpl im Test

describe('restoreWsFromSession', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('gibt leeres Array zurück, wenn Storage leer ist', () => {
        (safeReadAll as vi.Mock).mockReturnValue({});
        const res = restoreWsFromSession();
        expect(res).toEqual([]);
        expect(wsClient).not.toHaveBeenCalled();
    });

    it('erstellt für jeden Registry-Eintrag einen Client und gibt sie zurück', () => {
        const registry = {
            'wss://a.example/socket': {
                url: 'wss://a.example/socket',
                authToken: 't1',
                protocols: ['protoA'],
                appendAuthToQuery: false,
                wsImpl: FakeWS,
            },
            'wss://b.example/socket': {
                url: 'wss://b.example/socket',
                // kein authToken
                protocols: 'json',
                // appendAuthToQuery nicht gesetzt → default true erwartet
                // wsImpl nicht gesetzt
            },
        };
        (safeReadAll as vi.Mock).mockReturnValue(registry);

        const clientA = { id: 'A' };
        const clientB = { id: 'B' };
        (wsClient as vi.Mock)
            .mockReturnValueOnce(clientA)
            .mockReturnValueOnce(clientB);

        const res = restoreWsFromSession();

        // gibt die Clients in Einfügereihenfolge zurück
        expect(res).toEqual([clientA, clientB]);

        // Aufrufe prüfen
        expect(wsClient).toHaveBeenCalledTimes(2);

        expect((wsClient as vi.Mock).mock.calls[0][0]).toEqual({
            url: 'wss://a.example/socket',
            authToken: 't1',
            protocols: ['protoA'],
            appendAuthToQuery: false,
            wsImpl: FakeWS,
        });

        expect((wsClient as vi.Mock).mock.calls[1][0]).toEqual({
            url: 'wss://b.example/socket',
            authToken: undefined,
            protocols: 'json',
            appendAuthToQuery: true, // ✅ default greift
            wsImpl: undefined,
        });
    });

    it('ignoriert null/undefinierte Registry-Einträge robust', () => {
        (safeReadAll as vi.Mock).mockReturnValue({
            foo: null,
            bar: undefined,
        });
        const res = restoreWsFromSession();
        expect(res).toEqual([]);
        expect(wsClient).not.toHaveBeenCalled();
    });
});