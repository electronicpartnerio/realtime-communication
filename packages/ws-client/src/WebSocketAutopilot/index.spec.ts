/**
 * @vitest-environment happy-dom
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ---- HOISTED state & spies ----
const h = vi.hoisted(() => ({
    addSpy: vi.fn(),
    hideSpy: vi.fn(),
    tSpy: vi.fn(async (key: string, params?: any) =>
        params ? `${key}|${JSON.stringify(params)}` : key
    ),
    resumeSpy: vi.fn(async () => {}),
    sendRequestSpy: vi.fn(async () => ({})),
    initSpy: vi.fn(),
    messageHandlers: [] as Array<(msg: any) => void>,
}));

// ---- Mocks ----
vi.mock('@electronicpartnerio/uic', () => ({
    toastFactory: () => ({ add: h.addSpy, hide: h.hideSpy }),
}));
vi.mock('@electronicpartnerio/ep-lit-translate', () => ({
    t: { g: h.tSpy },
}));
vi.mock('../WebSocketService', () => {
    class WSStub {
        static _instance = new WSStub();
        static init = h.initSpy;
        static get instance() { return WSStub._instance; }
        onMessage = (cb: (msg: any) => void) => { h.messageHandlers.push(cb); return () => {
            const i = h.messageHandlers.indexOf(cb); if (i>=0) h.messageHandlers.splice(i,1);
        }; };
        resumePendingJobs = h.resumeSpy;
        sendRequest = h.sendRequestSpy;
    }
    return { WebSocketService: WSStub };
});

// SUT
import { WebSocketAutopilot } from './index';

// helpers
const emit = (msg: any) => h.messageHandlers.forEach(fn => fn(msg));
const flush = async () => { await Promise.resolve(); await new Promise(r => setTimeout(r, 0)); };
const reset = () => {
    h.addSpy.mockClear();
    h.hideSpy.mockClear();
    h.tSpy.mockClear();
    h.resumeSpy.mockClear();
    h.sendRequestSpy.mockClear();
    h.initSpy.mockClear();
    h.messageHandlers.splice(0, h.messageHandlers.length);
    localStorage.clear();
};

describe('WebSocketAutopilot', () => {
    const globalOpts = {
        url: 'wss://example/ws',
        getAuthToken: async () => 'tok',
        heartbeatMs: 1111,
        idleCloseMs: 2222,
        wsStorageKey: 'ws.jobs',
        cacheKeyBase: 'rc',
    };

    beforeEach(() => reset());

    it('initializes WebSocketService once with global options and resumes', async () => {
        const ap = new WebSocketAutopilot(globalOpts as any);
        expect(h.initSpy).toHaveBeenCalledTimes(1);
        expect(h.initSpy.mock.calls[0][0]).toMatchObject({
            url: globalOpts.url,
            heartbeatMs: globalOpts.heartbeatMs,
            idleCloseMs: globalOpts.idleCloseMs,
            storageKey: globalOpts.wsStorageKey,
        });

        ap.register({ type: 'printTag', toast: {} });
        await flush(); // ensure ensureWsReady -> resumePendingJobs awaited
        expect(h.resumeSpy).toHaveBeenCalledTimes(1);
    });

    it('shows pending Boot-Toast when cache has pending jobs for jobType', async () => {
        localStorage.setItem('rc:printTag', JSON.stringify({ pendingJobs: ['j1','j2'] }));

        const ap = new WebSocketAutopilot(globalOpts as any);
        ap.register({
            type: 'printTag',
            toast: { showPending: ['printTag.pending', 'warning'] },
        });
        await flush(); // showBootToasts awaits t.g

        expect(h.hideSpy).toHaveBeenCalledWith('rc:printTag:pending');
        expect(h.addSpy).toHaveBeenCalledWith('printTag.pending', 'warning', 'rc:printTag:pending');
        expect(h.tSpy.mock.calls.some(args => args[0] === 'printTag.pending')).toBe(true);
    });

    it('on ack: adds pending and shows pending toast', async () => {
        const ap = new WebSocketAutopilot(globalOpts as any);
        ap.register({
            type: 'printTag',
            toast: { showPending: ['printTag.pending', 'warning'] },
        });
        await flush();

        emit({ type: 'printTag.ack', jobId: 'J-42', correlationId: 'C1' });
        await flush(); // await t.g + toast.add
        const stored = JSON.parse(localStorage.getItem('rc:printTag') || '{}');
        expect(stored.pendingJobs).toContain('J-42');
        expect(h.hideSpy).toHaveBeenCalledWith('rc:printTag:pending');
        expect(h.addSpy).toHaveBeenLastCalledWith('printTag.pending', 'warning', 'rc:printTag:pending');
    });

    it('on job.done: removes pending, stores outcome, shows success with full msg as params', async () => {
        const ap = new WebSocketAutopilot(globalOpts as any);
        ap.register({
            type: 'printTag',
            toast: {
                showSuccess: ['printTag.success', 'success'],
                showPending: ['printTag.pending', 'warning'],
            },
        });
        await flush();

        emit({ type: 'printTag.ack', jobId: 'J-1' });
        await flush();

        const msg = { type: 'printTag.job.done', jobId: 'J-1', count: 2, foo: 'bar' };
        emit(msg);
        await flush();

        const c = JSON.parse(localStorage.getItem('rc:printTag') || '{}');
        expect((c.pendingJobs || []).includes('J-1')).toBe(false);
        expect(c.lastOutcome?.type).toBe('success');
        expect(c.lastOutcomeMsg).toEqual(msg);

        expect(h.tSpy).toHaveBeenCalledWith('printTag.success', msg);
        expect(h.hideSpy).toHaveBeenCalledWith('rc:printTag:success');
        expect(h.addSpy).toHaveBeenLastCalledWith(
            expect.stringContaining('printTag.success|'),
            'success',
            'rc:printTag:success'
        );
    });

    it('on job.error: removes pending, stores outcome, shows error with full msg as params', async () => {
        const ap = new WebSocketAutopilot(globalOpts as any);
        ap.register({
            type: 'printTag',
            toast: {
                showError: ['printTag.error', 'error'],
                showPending: ['printTag.pending', 'warning'],
            },
        });
        await flush();

        emit({ type: 'printTag.ack', jobId: 'J-2' });
        await flush();

        const errMsg = { type: 'printTag.job.error', jobId: 'J-2', reason: 'no paper' };
        emit(errMsg);
        await flush();

        const c = JSON.parse(localStorage.getItem('rc:printTag') || '{}');
        expect((c.pendingJobs || []).includes('J-2')).toBe(false);
        expect(c.lastOutcome?.type).toBe('error');
        expect(c.lastOutcomeMsg).toEqual(errMsg);

        expect(h.tSpy).toHaveBeenCalledWith('printTag.error', errMsg);
        expect(h.hideSpy).toHaveBeenCalledWith('rc:printTag:error');
        expect(h.addSpy).toHaveBeenLastCalledWith(
            expect.stringContaining('printTag.error|'),
            'error',
            'rc:printTag:error'
        );
    });

    it('boot shows aggregated lastOutcome and clears it afterwards', async () => {
        localStorage.setItem('rc:printTag', JSON.stringify({
            pendingJobs: [],
            lastOutcome: { type: 'success', count: 2, at: Date.now() },
            lastOutcomeMsg: { count: 2 }
        }));

        const ap = new WebSocketAutopilot(globalOpts as any);
        ap.register({
            type: 'printTag',
            toast: { showSuccess: ['printTag.success', 'success'] },
        });
        await flush();

        expect(h.tSpy).toHaveBeenCalledWith('printTag.success', { count: 2 });
        expect(h.hideSpy).toHaveBeenCalledWith('rc:printTag:success');
        expect(h.addSpy).toHaveBeenCalledWith(
            expect.stringContaining('printTag.success|'),
            'success',
            'rc:printTag:success'
        );

        const c = JSON.parse(localStorage.getItem('rc:printTag') || '{}');
        expect(c.lastOutcome).toBeUndefined();
        expect(c.lastOutcomeMsg).toBeUndefined();
    });

    it('register().send() delegates to WebSocketService.sendRequest with type.start', async () => {
        const ap = new WebSocketAutopilot(globalOpts as any);
        const conn = ap.register({ type: 'printTag', toast: {} });
        await flush();

        await conn.send({ some: 1 });
        expect(h.sendRequestSpy).toHaveBeenCalledWith(
            { type: 'printTag.start', payload: { some: 1 } },
            { trackJob: true }
        );
    });
});