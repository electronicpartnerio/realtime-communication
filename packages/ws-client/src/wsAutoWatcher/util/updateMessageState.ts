import {watcherCache} from "../../cache";
import {writeWatcherCache} from "./writeWatcherCache";
import type {MessageState} from "../../interface";

export const updateMessageState = (id: string, newState: MessageState): void => {
    if (!watcherCache.has(id)) return;
    const entry = watcherCache.get(id)!;
    entry.state = newState;

    watcherCache.set(id, entry);
    writeWatcherCache();
};