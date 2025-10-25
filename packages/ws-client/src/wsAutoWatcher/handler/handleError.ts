import type {WsResponse} from "../../interface";
import {showToast} from "../util/showToast";
import {removeMessage} from "../util/removeMessage";

export const handleError = async ({toast, uid}: WsResponse) => {
    await showToast('danger', uid, toast);
    removeMessage(uid);
};