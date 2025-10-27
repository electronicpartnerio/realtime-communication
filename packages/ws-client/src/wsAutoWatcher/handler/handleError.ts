import type {WsResponse} from "../../interface";
import {showToast} from "../util/showToast";
import {removeMessage} from "../util/removeMessage";
import {hideToast} from "../util/hideToast";

export const handleError = async ({toast, id}: WsResponse) => {
    hideToast(id);
    await showToast('danger', id, toast);
    removeMessage(id);
};