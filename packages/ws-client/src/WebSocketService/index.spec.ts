/**
 * @vitest-environment happy-dom
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---------- HOISTED shared state ----------
const h = vi.hoisted(() => ({
    // toast spies
    toast: { showPending: vi.fn(), showSuccess: vi.fn(), showError: vi.fn() },

    // JobTracker in-memory store + spies
    jobs: [] as any[],
    jt: {
        upsert: vi.fn((job: any) => {
            const i = h.jobs.findIndex((j: any) => j.jobId === job.jobId);
            if (i >= 0) h.jobs[i] = job; else h.jobs.push(job);
        }),
        pending: vi.fn(() => h.jobs.filter(j => j.status === 'pending')),
        get: vi.fn((id: string) => h.jobs.find(j => j.jobId === id)),
        list: vi.fn(() => [...h.jobs]),
        saveAll: vi.fn((list: any[]) => { h.jobs = [...list]; }),
        remove: vi.fn((id: string) => { h.jobs = h.jobs.filter(j => j.jobId !== id); }),
    },

    // last ws instance
    lastWS: null as any,
}));

// ---------- Mocks ----------
vi.mock('../JobTracker', () => ({
    JobTracker: class {
        constructor(_key?: string) {}
        upsert = h.jt.upsert;
        pending = h.jt.pending;
        get = h.jt.get;
        list = h.jt.list;
        saveAll = h.jt.saveAll;
        remove = h.jt.remove;
    },
}));

vi.mock('@electronicpartnerio/uic', () => ({
    toastFactory: () => h.toast,
}));

vi.mock('@electronicpartnerio/ep-lit-translate', () => ({
    t: { g: vi.fn(async (key: string, params?: any) => (params ? `${key}|${JSON.stringify(params)}` : key)) },
}));

// ---- WebSocket stub (must be set BEFORE importing SUT) ----
const hoistedWS = vi.hoisted(() => {
    class WSStub {
        static CONNECTING = 0;
        static OPEN = 1;
        readyState = WSStub.CONNECTING;
        onopen: (() => void) | null = null;
        onmessage: ((ev: { data: any }) => void) | null = null;
        onclose: (() => void) | null = null;
        onerror: (() => void) | null = null;
        sent: any[] = [];
        url: string;
        protocols?: any;

        constructor(url: string, protocols?: any) {
            this.url = url;
            this.protocols = protocols;
            h.lastWS = this;
        }
        send = (d: any) => { this.sent.push(d); };
        close = (_code?: number, _reason?: string) => {
            this.readyState = WSStub.CONNECTING;
            this.onclose?.();
        };
    }

    // Override both window and globalThis to be safe in happy-dom
    Object.defineProperty(globalThis, 'WebSocket', { configurable: true, value: WSStub });
    if (typeof window !== 'undefined') {
        Object.defineProperty(window, 'WebSocket', { configurable: true, value: WSStub });
    }
    return { WSStub };
});

// ---- now import SUT (after stubbing WebSocket) ----
import { WebSocketService } from './index';

// helpers
const tick = () => new Promise<void>(r => setTimeout(r, 0));
const waitForWS = async () => {
    for (let i = 0; i < 10 && !h.lastWS; i++) await tick();
    if (!h.lastWS) throw new Error('WS instance was not created');
};
const openSocket = async () => {
    await waitForWS();
    
    const ws = h.lastWS!;
    ws.readyState = hoistedWS.WSStub.OPEN;
    ws.onopen?.();
};
const emitSocket = (msg: any) => {
    h.lastWS?.onmessage?.({ data: JSON.stringify(msg) });
};
const reset = () => {
    h.jobs.length = 0;
    Object.values(h.toast).forEach(spy => spy.mockClear());
    localStorage.clear();
    try {
        // vorhandene Instanz sauber schließen
        (WebSocketService as any)._instance?.close?.();
    } catch {}
    // Singleton-Ref kappen, damit init() wieder eine frische Instanz erstellt
    (WebSocketService as any)._instance = null;

    // WS-Stub leeren
    h.lastWS && (h.lastWS.sent = []);
    h.lastWS = null;
};

describe('WebSocketService', () => {
    beforeEach(reset);

    it('init + connect opens WS and appends token query', async () => {
        WebSocketService.init({
            url: 'wss://api.example/ws',
            getAuthToken: async () => 'TKN',
            toast: h.toast as any,
        });
        await openSocket();

        // URL inklusive token? -> aus h.lastWS.url herauslesen
        expect(h.lastWS.url).toBe('wss://api.example/ws?token=TKN');
        // protocols bleiben optional
        expect(h.lastWS.protocols).toBeUndefined();
    });

    it('sendRequest (non-job) resolves on direct reply', async () => {
        WebSocketService.init({ url: 'wss://api/ws', toast: h.toast as any });
        await openSocket();

        // 1) Request absetzen
        const p = WebSocketService.instance.sendRequest({ type: 'echo', payload: { a: 1 } });

        // 2) Einen Tick warten, damit ws.send(...) ausgeführt wurde
        await tick();

        // 3) correlationId aus dem tatsächlich gesendeten Frame holen
        const sentFrames = h.lastWS.sent.map(s => JSON.parse(s));
        const cid = sentFrames[0]?.correlationId;
        expect(cid).toBeTruthy(); // sanity check

        // 4) Server-Antwort mit der CID emittieren
        emitSocket({ type: 'echo.result', correlationId: cid, data: { ok: true } });

        // 5) Promise erfüllt sich jetzt
        const resp: any = await p;
        expect(resp.type).toBe('echo.result');
        expect(h.toast.showSuccess).not.toHaveBeenCalled();
    });

    it('trackJob: ack -> pending; job.done -> resolves + success toast', async () => {
        WebSocketService.init({ url: 'wss://api/ws', toast: h.toast as any });
        await openSocket();

        let cid: string | undefined;
        const origSend = h.lastWS.send;
        h.lastWS.send = (data: any) => {
            const obj = JSON.parse(data);
            cid = obj.correlationId;
            origSend.call(h.lastWS, data);
        };

        const p = WebSocketService.instance.sendRequest(
            { type: 'printTag.start', payload: {} },
            { trackJob: true, toastPendingText: 'Wird gedruckt…', toastSuccessText: 'Fertig!' }
        );
        await tick();

        emitSocket({ type: 'ack', correlationId: cid, jobId: 'J-1' });
        // Pending gespeichert?
        expect(h.jt.upsert).toHaveBeenCalledWith(expect.objectContaining({
            jobId: 'J-1',
            status: 'pending',
            correlationId: cid,
        }));

        emitSocket({ type: 'job.done', correlationId: cid, jobId: 'J-1', downloadUrl: 'https://file' });
        const final: any = await p;

        expect(final.type).toBe('job.done');
        // Tracker wurde auf done gesetzt
        const job = h.jobs.find(j => j.jobId === 'J-1');
        expect(job?.status).toBe('done');
        // Success-Toast angezeigt
        expect(h.toast.showSuccess).toHaveBeenCalledWith(expect.stringMatching(/^toast_/), 'Fertig!');
    });

    it('resumePendingJobs re-subscribes and re-shows pending toast', async () => {
        WebSocketService.init({ url: 'wss://api/ws', toast: h.toast as any, storageKey: 'ws.jobs' });
        await openSocket();

        // Seed pending jobs direkt in den Tracker-Store
        h.jobs = [
            { jobId: 'A', status: 'pending', toastId: 'toast_A', toastTexts: { toastPendingText: 'Hänge…' } },
            { jobId: 'B', status: 'pending', toastId: 'toast_B', toastTexts: { toastPendingText: 'Hänge 2…' } },
            { jobId: 'C', status: 'done' },
        ];

        await WebSocketService.instance.resumePendingJobs();

        const sent = h.lastWS.sent.map(s => JSON.parse(s));
        expect(sent).toEqual([
            { type: 'job.subscribe', jobId: 'A' },
            { type: 'job.subscribe', jobId: 'B' },
        ]);

        expect(h.toast.showPending).toHaveBeenCalledWith('toast_A', 'Hänge…');
        expect(h.toast.showPending).toHaveBeenCalledWith('toast_B', 'Hänge 2…');
    });

    it('trackJob: job.error rejects and shows error toast', async () => {
        WebSocketService.init({ url: 'wss://api/ws', toast: h.toast as any });
        await openSocket();

        let cid: string | undefined;
        const origSend = h.lastWS.send;
        h.lastWS.send = (data: any) => {
            const obj = JSON.parse(data);
            cid = obj.correlationId;
            origSend.call(h.lastWS, data);
        };

        const p = WebSocketService.instance.sendRequest(
            { type: 'printTag.start', payload: {} },
            { trackJob: true, toastPendingText: '...', toastErrorText: 'Fehlgeschlagen.' }
        );
        await tick();

        emitSocket({ type: 'ack', correlationId: cid, jobId: 'J-ERR' });
        emitSocket({ type: 'job.error', correlationId: cid, jobId: 'J-ERR', error: 'kaputt' });

        await expect(p).rejects.toThrow('kaputt');
        expect(h.toast.showError).toHaveBeenCalledWith(expect.stringMatching(/^toast_/), 'Fehlgeschlagen.');
    });
});