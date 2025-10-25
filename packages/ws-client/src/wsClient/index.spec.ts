// ws-client.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { wsClient } from './index';

class MockWS {
    static OPEN = 1;
    readyState = 0;
    private listeners: Record<string, Function[]> = {};
    constructor(public url: string, public protocols?: string | string[]) {}
    addEventListener = (t: string, cb: any) =>
        ((this.listeners[t] ||= []).push(cb));
    removeEventListener = vi.fn();
    send = vi.fn();
    close = vi.fn((code?: number, reason?: string) => {
        this.readyState = 3;
        this.emit('close', { code, reason } as CloseEvent);
    });
    // helpers
    open = () => { this.readyState = MockWS.OPEN; this.emit('open', {} as Event); };
    message = (data: any) => this.emit('message', { data } as MessageEvent);
    error = (err: any) => this.emit('error', err as Event);
    private emit = (t: string, e: any) => (this.listeners[t] || []).forEach(f => f(e));
}

describe('wsClient (functional)', () => {
    it('returns same instance per normalized URL', () => {
        const a = wsClient({ url: 'wss://x', wsImpl: MockWS as any });
        const b = wsClient({ url: 'wss://x', wsImpl: MockWS as any });
        expect(a).toBe(b);
    });

    it('ready() resolves after open; send() works only when OPEN', async () => {
        const mock = new MockWS('wss://x');
        const c = wsClient({ url: 'wss://x?x=1', wsImpl: (MockWS as any) });
        // get underlying mock to drive events:
        // @ts-expect-error: access for test
        const ws = (c.socket() as any) as MockWS;
        await expect(c.ready()).rejects.toBeDefined(); // not open yet → will wait; we'll reject by triggering error:
        // Better: attach, then open:
        const c2 = wsClient({ url: 'wss://y', wsImpl: (MockWS as any) });
        // @ts-expect-error
        const ws2 = c2.socket() as MockWS;
        const p = c2.ready();
        ws2.open();
        await expect(p).resolves.toBeUndefined();
        expect(() => c2.send('hi')).not.toThrow();
    });

    it('emits message and allows off()', () => {
        const c = wsClient({ url: 'wss://m', wsImpl: (MockWS as any) });
        // @ts-expect-error
        const ws = c.socket() as MockWS;
        const handler = vi.fn((e: MessageEvent) => e.data);
        c.on('message', handler);
        ws.open();
        ws.message('foo');
        expect(handler).toHaveBeenCalledTimes(1);
        c.off('message', handler);
        ws.message('bar');
        expect(handler).toHaveBeenCalledTimes(1);
    });

    it('close() clears registry and listeners', () => {
        const c1 = wsClient({ url: 'wss://z', wsImpl: (MockWS as any) });
        // @ts-expect-error
        const ws = c1.socket() as MockWS;
        c1.on('close', () => {});
        c1.close(1000, 'bye');
        // neue Instanz möglich
        const c2 = wsClient({ url: 'wss://z', wsImpl: (MockWS as any) });
        expect(c1).not.toBe(c2);
    });

    it('appends token when appendAuthToQuery=true (default)', () => {
        const c = wsClient({ url: 'wss://x', authToken: 'T', wsImpl: (MockWS as any) });
        // @ts-expect-error
        const ws = c.socket() as MockWS;
        expect(ws.url).toContain('token=T');
    });

    it('passes protocols to WebSocket', () => {
        const c = wsClient({ url: 'wss://x', protocols: ['p1'], wsImpl: (MockWS as any) });
        // @ts-expect-error
        const ws = c.socket() as MockWS;
        expect(ws.protocols).toEqual(['p1']);
    });
});