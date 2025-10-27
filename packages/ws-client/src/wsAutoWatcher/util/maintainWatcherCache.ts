import {watcherCache} from "../../cache";
import type {WatchedMessage, WsResponse} from "../../interface";
import {SESSION_LIFETIME} from "../../constant";
import {removeMessage} from "./removeMessage";
import {handlePending} from "../handler/handlePending";

export const maintainWatcherCache = () => {
    watcherCache.forEach(async ({id, state, payload, timestamp}: WatchedMessage) => {
        if((Date.now() - timestamp) > SESSION_LIFETIME || ['success', 'error'].includes(state)) {
            removeMessage(id);
            return;
        }

        if(state === 'pending') {
            const toast = payload.toastPending as string;
            await handlePending({toast, id} as WsResponse)
        }
    });
}