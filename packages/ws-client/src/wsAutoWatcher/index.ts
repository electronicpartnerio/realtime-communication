import {watcherCache} from "../cache";
import {readWatcherCache} from "./util/readWatcherCache";
import {restoreWsFromSession} from "../util/restoreWsFromSession";
import {writeWatcherCache} from "./util/writeWatcherCache";
import type {WatchedMessage, WsLoosePayload, WsServiceFunction} from "../interface";
import {WS_WATCH_KEY} from "../constant";
import {initClient} from "./util/initClient";
import {logger} from "../util/logger";
import {maintainWatcherCache} from "./util/maintainWatcherCache";

export const wsAutoWatcher = () => {
    let clients: WsServiceFunction[];

    const init = (): void => {
        readWatcherCache();
        clients = restoreWsFromSession();
        clients.forEach((client) => initClient(client));

        maintainWatcherCache()

        logger.info('[wsAutoWatcher] initialisiert:', watcherCache.size, 'Nachrichten im Cache');
    };

    const register = (url: string, id: string, payload: WsLoosePayload) => {
        const {state} = payload;

        if(!id) return;

        watcherCache.set(id, {
            id,
            url,
            payload,
            state: state || 'send',
            timestamp: Date.now(),
        });
        writeWatcherCache();
    };

    const update = (payload: WsLoosePayload): void => {
        const {id, state} = payload;

        if(['success', 'error'].includes(String(state)) && watcherCache.has(id)) {
            unregister(id);
            return;
        }

        if (!watcherCache.has(id)) return;

        const current = watcherCache.get(id)!;
        watcherCache.set(id, { ...current, ...payload });
        writeWatcherCache();
    }

    const unregister = (id: string): void => {
        watcherCache.delete(id);
        writeWatcherCache();
    }

    const list = (): WatchedMessage[] => Array.from(watcherCache.values());

    const clear = (): void => {
        watcherCache.clear();
        sessionStorage.removeItem(WS_WATCH_KEY);
    };

    return {
        init,
        register,
        unregister,
        update,
        list,
        clear,
    };
}
