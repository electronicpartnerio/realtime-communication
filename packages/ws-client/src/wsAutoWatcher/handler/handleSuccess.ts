import type {WsResponse} from "../../interface";
import {showToast} from "../util/showToast";
import {handleDownload} from "./download";
import {handleAlert} from "./handleAlert";
import {handleForceReload} from "./handleForceReload";
import {removeMessage} from "../util/removeMessage";
import {hideToast} from "../util/hideToast";

export const handleSuccess = async ({id, toast, data}: WsResponse) => {
    hideToast(id);
    await showToast('success', id, toast);

    const type = data?.type as 'download' | 'alert' | 'forceReload' | undefined;
    if (!type) return;

    switch (type) {
        case 'download': {
            await handleDownload(data);
            break;
        }
        case 'alert': {
            // Message bevorzugt aus data.msg; Fallback auf toast
            const message = data?.msg ?? toast;
            await handleAlert(message);
            break;
        }
        case 'forceReload': {
            // Confirm-Text bevorzugt aus data.msg; Fallback auf toast
            const message = data?.msg ?? toast;
            await handleForceReload(message);
            break;
        }
    }

    removeMessage(id);
};