import {WS_WATCH_KEY} from "../../constant";
import type {WatchedMessage} from "../../interface";
import {watcherCache} from "../../cache";

export const readWatcherCache = (): void => {
    try {
        const raw = sessionStorage.getItem(WS_WATCH_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, WatchedMessage>;
        Object.values(parsed).forEach(msg => watcherCache.set(msg.id, msg));
    } catch {}
};