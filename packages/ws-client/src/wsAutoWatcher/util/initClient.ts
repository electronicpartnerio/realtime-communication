import {safeParse} from "../../util/safeParse";
import type {WsResponse, WsResponseState, WsServiceFunction} from "../../interface";
import {updateMessageState} from "./updateMessageState";
import {handlePending} from "../handler/handlePending";
import {handleError} from "../handler/handleError";
import {handleSuccess} from "../handler/handleSuccess";

const messageStateMap: Record<WsResponseState, (d: WsResponse) => Promise<void>> = {
    pending: handlePending,
    error: handleError,
    success: handleSuccess,
};

export const initClient = (client: WsServiceFunction) => {
    client.on('message', async (e: MessageEvent) => {
        const msg = safeParse<WsResponse>(e.data);
        if (!msg?.id || !msg?.state) return;

        updateMessageState(msg.id, msg.state);
        const handler = messageStateMap[msg.state];
        if (handler) {
            await handler(msg)
        }
    });
}
