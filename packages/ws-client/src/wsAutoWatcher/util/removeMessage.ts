import {writeWatcherCache} from "./writeWatcherCache";
import {watcherCache} from "../../cache";

export const removeMessage = (uid: string): void => {
    watcherCache.delete(uid);
    writeWatcherCache();
};