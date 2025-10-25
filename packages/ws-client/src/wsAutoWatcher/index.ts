import {watcherCache} from "../cache";
import {readWatcherCache} from "./util/readWatcherCache";
import {restoreWsFromSession} from "../util/restoreWsFromSession";
import {writeWatcherCache} from "./util/writeWatcherCache";
import type {WatchedMessage} from "../interface";
import {WS_WATCH_KEY} from "../constant";
import {initClient} from "./util/initClient";
import {logger} from "../util/logger";

export const wsAutoWatcher = () => {
    const init = (): void => {
        readWatcherCache();
        const clients = restoreWsFromSession();
        clients.forEach(initClient);

        logger.info('[wsAutoWatcher] initialisiert:', watcherCache.size, 'Nachrichten im Cache');
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