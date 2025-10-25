import {safeParse} from "../../util/safeParse";
import type {WsResponse, WsResponseState, WsService} from "../../interface";
import {updateMessageState} from "./updateMessageState";
import {handlePending} from "../handler/handlePending";
import {handleError} from "../handler/handleError";
import {handleSuccess} from "../handler/handleSuccess";

const messageStateMap: Record<WsResponseState, (d: WsResponse) => Promise<void>> = {
    pending: handlePending,
    error: handleError,
    success: handleSuccess,
};

export const initClient = (client: WsService) => {
    client.on('message', async (e: MessageEvent) => {
        const msg = safeParse<WsResponse>(e.data);
        if (!msg?.uid || !msg?.state) return;

        updateMessageState(msg.uid, msg.state);
        const handler = messageStateMap[msg.state];
        if (handler) {
            await handler(msg)
        }
    });
}