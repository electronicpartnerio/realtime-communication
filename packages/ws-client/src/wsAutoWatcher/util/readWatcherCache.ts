import {WS_WATCH_KEY} from "../../constant";
import type {WatchedMessage} from "../../interface";
import {watcherCache} from "../../cache";

export const readWatcherCache = (): void => {
    try {
        const raw = sessionStorage.getItem(WS_WATCH_KEY);
        if (!raw) return;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return;

        Object.values(parsed as Record<string, WatchedMessage>).forEach(msg => {
            if (msg?.id) watcherCache.set(msg.id, msg);
        });
    } catch {
        // still safe to ignore errors
    }
};