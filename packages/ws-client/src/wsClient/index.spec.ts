/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wsClient } from './index';

// ---- Dependencies mocken ----
vi.mock('./util/normalizeUrl', () => ({
    normalizeUrl: vi.fn((url: string) => url), // 1:1 für stabile Keys
}));
vi.mock('./util/safePersistToSession', () => ({
    safePersistToSession: vi.fn(),
}));
vi.mock('./util/safeRemoveFromSession', () => ({
    safeRemoveFromSession: vi.fn(),
}));
vi.mock('../wsAutoWatcher', () => {
    const register = vi.fn();
    const api = () => ({ register });
    (api as any).__registerMock = register;
    return { wsAutoWatcher: api };
});
vi.mock('../util/safeParse', () => ({
    safeParse: vi.fn(),
}));
vi.mock('../cache', () => ({
    registry: new Map<string, any>(),
}));
vi.mock('../util/logger', () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), log: vi.fn() },
}));

import { normalizeUrl } from './util/normalizeUrl';
import { safePersistToSession } from './util/safePersistToSession';
import { safeRemoveFromSession } from './util/safeRemoveFromSession';
import { wsAutoWatcher } from '../wsAutoWatcher';
import { safeParse } from '../util/safeParse';
import { registry } from '../cache';

// ---- WebSocket Mock (addEventListener-basiert) ----
class WS_Mock {
    static OPEN = 1;
    static CONNECTING = 0;
    readyState = WS_Mock.CONNECTING;
    url: string;
    protocols?: string | string[];
    private handlers: Record<string, Function[]> = {};

    constructor(url: string, protocols?: string | string[]) {
        this.url = url;
        this.protocols = protocols;
        // open-Event asynchron simulieren
        queueMicrotask(() => {
            this.readyState = WS_Mock.OPEN;
            this.dispatchEvent('open', { type: 'open' });
        });
    }

    addEventListener(type: string, cb: any) {
        (this.handlers[type] ||= []).push(cb);
    }
    removeEventListener(type: string, cb: any) {
        this.handlers[type] = (this.handlers[type] || []).filter((fn) => fn !== cb);
    }
    dispatchEvent(type: string, ev: any) {
        (this.handlers[type] || []).forEach((fn) => fn(ev));
    }

    sent: any[] = [];
    send(data: any) { this.sent.push(data); }
    close(code?: number, reason?: string) {
        this.readyState = 3;
        this.dispatchEvent('close', { code, reason });
    }
}

describe('wsClient', () => {
    const OrigWS = (globalThis as any).WebSocket;

    beforeEach(() => {
        vi.clearAllMocks();
        (globalThis as any).WebSocket = WS_Mock;
        (registry as Map<string, any>).clear();
    });

    afterEach(() => {
        (globalThis as any).WebSocket = OrigWS;
    });

    it('öffnet Verbindung und ready() resolved nach open', async () => {
        const c = wsClient({ url: 'wss://demo/socket' })!;
        await c.ready();
        expect(normalizeUrl).toHaveBeenCalledWith('wss://demo/socket', undefined, true);
        expect(c.isOpen()).toBe(true);
    });

    it('send() wirft, wenn Socket nicht open ist', () => {
        const c = wsClient({ url: 'wss://late' })!;
        expect(() => c.send('hi')).toThrow('WebSocket is not open');
    });

    it('send() mit persist → schreibt Session & registriert beim Watcher', async () => {
        const c = wsClient({ url: 'wss://persist' })!;
        await c.ready();

        const payload = { id: 'u1', data: { foo: 1 } };
        // safeParse soll das versendete JSON in { data: ... } auflösen
        (safeParse as vi.Mock).mockReturnValueOnce({ data: payload });

        c.send(JSON.stringify(payload), { persist: true });

        expect(safePersistToSession).toHaveBeenCalledWith('wss://persist', {
            url: 'wss://persist',
            authToken: undefined,
            protocols: undefined,
            appendAuthToQuery: true,
        });

        const watcher = wsAutoWatcher() as any;
        const registerMock = (wsAutoWatcher as any).__registerMock as vi.Mock;
        expect(registerMock).toHaveBeenCalledWith('wss://persist', payload);
    });

    it('send() mit persist, aber ohne parsebare payload.data → kein watcher.register', async () => {
        const c = wsClient({ url: 'wss://persist2' })!;
        await c.ready();

        (safeParse as vi.Mock).mockReturnValueOnce({}); // keine data
        c.send(JSON.stringify({ foo: 1 }), { persist: true });

        const registerMock = (wsAutoWatcher as any).__registerMock as vi.Mock;
        expect(registerMock).not.toHaveBeenCalled();
    });

    it('on/off registriert und entfernt Listener; message wird durchgereicht', async () => {
        const c = wsClient({ url: 'wss://msg' })!;
        await c.ready();

        const fn = vi.fn();
        c.on('message', fn);

        const ws = c.socket() as any as WS_Mock;
        ws.dispatchEvent('message', { data: '{"hello":1}' });
        expect(fn).toHaveBeenCalledWith(expect.objectContaining({ data: '{"hello":1}' }));

        c.off('message', fn);
        ws.dispatchEvent('message', { data: 'again' });
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('close(true) → release: löscht aus registry, aber kein safeRemoveFromSession', async () => {
        const c = wsClient({ url: 'wss://soft' })!;
        await c.ready();

        c.close(true);
        expect(safeRemoveFromSession).not.toHaveBeenCalled();
        // registry-Eintrag ist entfernt (release→ref<=0→hardClose)
        expect((registry as Map<string, any>).size).toBe(0);
    });

    it('close(false) → hard close: löscht registry & Storage', async () => {
        const c = wsClient({ url: 'wss://hard' })!;
        await c.ready();

        c.close(false, 1000, 'bye');
        expect(safeRemoveFromSession).toHaveBeenCalledWith('wss://hard');
        expect((registry as Map<string, any>).size).toBe(0);
    });

    it('singleton pro normalized URL: zweite Instanz liefert existierenden Client', async () => {
        (normalizeUrl as vi.Mock).mockImplementation((u: string) => u); // 1:1
        const a = wsClient({ url: 'wss://one' })!;
        const b = wsClient({ url: 'wss://one' })!;
        expect(a).toBe(b);
        await a.ready();
        await b.ready();
    });

    it('löscht registry-Eintrag bei echter Socket-close-Nachricht', async () => {
        const c = wsClient({ url: 'wss://server-close' })!;
        await c.ready();

        const ws = c.socket() as any as WS_Mock;
        ws.close(1000, 'server said bye');

        expect((registry as Map<string, any>).size).toBe(0);
    });
});