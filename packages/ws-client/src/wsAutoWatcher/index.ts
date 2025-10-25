import {watcherCache} from "../cache";
import {readWatcherCache} from "./util/readWatcherCache";
import {restoreWsFromSession} from "../util/restoreWsFromSession";
import {safeParse} from "../util/safeParse";
import {writeWatcherCache} from "./util/writeWatcherCache";
import type {WatchedMessage, WsResponse, WsResponseState} from "../interface";
import {WS_WATCH_KEY} from "../constant";
import {updateMessageState} from "./util/updateMessageState";
import {handleError} from "./handler/handleError";
import {handleSuccess} from "./handler/handleSuccess";
import {handlePending} from "./handler/handlePending";

export const wsAutoWatcher = () => {

    const init = (): void => {
        readWatcherCache();

        const clients = restoreWsFromSession();
        const messageStateMap: Record<WsResponseState, (d: WsResponse) => Promise<void>> = {
            pending: handlePending,
            error: handleError,
            success: handleSuccess,
        };

        clients.forEach(client => {
            client.on('message', async (e: MessageEvent) => {
                const msg = safeParse<WsResponse>(e.data);
                if (!msg?.uid || !msg?.state) return;

                updateMessageState(msg.uid, msg.state);
                const handler = messageStateMap[msg.state];
                if (handler) {
                    await handler(msg)
                }
            });
        });

        console.info('[wsAutoWatcher] initialisiert:', watcherCache.size, 'Nachrichten im Cache');
    };

    const register = (url: string, payload: any): string => {
        const id = payload.id ?? crypto.randomUUID();
        watcherCache.set(id, {
            id,
            url,
            payload,
            state: 'send',
            timestamp: Date.now(),
        });
        writeWatcherCache();
        return id;
    };

    const update = (id: string, partial: Partial<WatchedMessage>): void => {
        if (!watcherCache.has(id)) return;
        const current = watcherCache.get(id)!;
        watcherCache.set(id, { ...current, ...partial });
        writeWatcherCache();
    };

    const list = (): WatchedMessage[] => Array.from(watcherCache.values());

    const clear = (): void => {
        watcherCache.clear();
        sessionStorage.removeItem(WS_WATCH_KEY);
    };

    return {
        init,
        register,
        update,
        list,
        clear,
        // zum Testen oder Debuggen nützlich:
        getCache: () => watcherCache,
    };
}