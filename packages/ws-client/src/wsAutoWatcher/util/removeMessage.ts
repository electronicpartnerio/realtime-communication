import {writeWatcherCache} from "./writeWatcherCache";
import { watcherCache} from "../../cache";

export const removeMessage = (id: string): void => {
    watcherCache.delete(id);
    writeWatcherCache();
};