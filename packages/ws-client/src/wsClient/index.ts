import type {
    EventMap,
    EventName, ListenerOf,
    ListenersMap,
    SendOptions,
    WsServiceFunction,
    WsServiceOptions,
    WSData, WsService
} from "../interface";
import {normalizeUrl} from "./util/normalizeUrl";
import {safePersistToSession} from "./util/safePersistToSession";
import {safeRemoveFromSession} from "./util/safeRemoveFromSession";
import {wsAutoWatcher} from "../wsAutoWatcher";
import {safeParse} from "../util/safeParse";
import {registry} from "../cache";
import {logger} from "../util/logger";

export const wsClient = (opts: WsServiceOptions): WsService => {
    const key = normalizeUrl(opts.url, opts.authToken, opts.appendAuthToQuery ?? true);
    const existing = registry.get(key);

    if (existing) return existing.client;

    const WS = opts.wsImpl ?? WebSocket;
    const listeners: ListenersMap = {
        open: new Set(),
        message: new Set(),
        close: new Set(),
        error: new Set(),
    };
    let watcher: ReturnType<typeof wsAutoWatcher> | null = null;

    const ensureWatcher = () => watcher ??= wsAutoWatcher();

    let ws: WebSocket | null = new WS(key, opts.protocols);

    if(!ws) {
        logger.error(`[ws] listener "${key}" failed to initialize`);
        return null
    }

    ws.addEventListener('open',    (e) => emit('open', e));
    ws.addEventListener('message', (e) => emit('message', e));
    ws.addEventListener('close',   (e) => {
        emit('close', e);
        registry.delete(key);
    });
    ws.addEventListener('error',   (e) => emit('error', e));

    const on = <K extends EventName>(event: K, cb: ListenerOf<K>) => {
        (listeners[event] as Set<ListenerOf<K>>).add(cb);
    };

    const off = <K extends EventName>(event: K, cb: ListenerOf<K>) => {
        (listeners[event] as Set<ListenerOf<K>>).delete(cb);
    };

    const emit = <K extends EventName>(evName: K, ev: EventMap[K]) => {
        for (const cb of listeners[evName] as Set<ListenerOf<K>>) {
            try {
                cb(ev);
            } catch (err) {
                logger.error(`[ws] listener "${evName}" failed`, err);
            }
        }
    };

    const send = (data: WSData, sendOpts?: SendOptions) => {
        if (!ws || ws.readyState !== WS.OPEN) throw new Error('WebSocket is not open');
        if (sendOpts?.persist) {

            safePersistToSession(key, {
                url: opts.url,
                authToken: opts.authToken,
                protocols: opts.protocols,
                appendAuthToQuery: opts.appendAuthToQuery ?? true,
            });

            // const parsed = safeParse<any>(data);
            // if (parsed) ensureWatcher().register(opts.url, parsed);

            const parsed = safeParse<any>(data);
            const payload = parsed?.data;
            if (payload) ensureWatcher().register(opts.url, parsed.id, payload);
        }

        ws.send(data);
    };

    const ready = async (): Promise<void> => {
        if (ws && ws.readyState === WS.OPEN) return;
        return new Promise<void>((resolve, reject) => {
            const onOpen  = () => { off('error', onErr); off('close', onClose); resolve(); };
            const onErr   = (e: Event) => { off('open', onOpen); off('close', onClose); reject(e); };
            const onClose = (e: CloseEvent) => { off('open', onOpen); off('error', onErr); reject(e); };
            on('open', onOpen);
            on('error', onErr);
            on('close', onClose);
        });
    };

    const release = () => {
        const entry = registry.get(key);
        if (!entry) return;
        entry.ref -= 1;
        if (entry.ref <= 0) {
            registry.delete(key);
            hardClose(1000, 'released');
        }
    };

    const close = (soft: boolean = true, code?: number, reason?: string) => {
        if (soft) {
            release();
            return;
        }
        try { hardClose(code, reason); }
        finally {
            registry.delete(key);
            safeRemoveFromSession(key);
        }
    };

    const hardClose = (code?: number, reason?: string) => {
        try { ws?.close(code, reason); }
        finally {
            (Object.keys(listeners) as EventName[]).forEach(k => listeners[k].clear());
            ws = null;
        }
    };

    const isOpen = () => !!ws && ws.readyState === WS.OPEN;
    const socket = () => ws;

    const client: WsServiceFunction = { send, ready, close, hardClose, release, on, off, isOpen, socket };
    registry.set(key, { client, ref: 1 });
    return client;
};
