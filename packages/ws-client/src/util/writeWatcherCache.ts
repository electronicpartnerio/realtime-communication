import {WS_WATCH_KEY} from "../constant";
import {watcherCache} from "../cache";
import type {WatchedMessage} from "../interface";

export const writeWatcherCache = (): void => {
    try {
        const obj: Record<string, WatchedMessage> = {};
        watcherCache.forEach((msg, id) => (obj[id] = msg));
        sessionStorage.setItem(WS_WATCH_KEY, JSON.stringify(obj));
    } catch {}
};