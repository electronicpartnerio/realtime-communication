import type {WsResponse} from "../../interface";
import {showToast} from "../util/showToast";
import {handleDownload} from "./download";
import {handleAlert} from "./handleAlert";
import {handleForceReload} from "./handleForceReload";

export const handleSuccess = async (resp: WsResponse) => {
    await showToast('success', resp.uid, resp.toast);

    const type = resp.data?.type as 'download' | 'alert' | 'forceReload' | undefined;
    if (!type) return;

    switch (type) {
        case 'download': {
            await handleDownload(resp.data);
            break;
        }
        case 'alert': {
            // Message bevorzugt aus data.msg; Fallback auf toast
            const message = resp.data?.msg ?? resp.toast;
            await handleAlert(message);
            break;
        }
        case 'forceReload': {
            // Confirm-Text bevorzugt aus data.msg; Fallback auf toast
            const message = resp.data?.msg ?? resp.toast;
            await handleForceReload(message);
            break;
        }
    }
};