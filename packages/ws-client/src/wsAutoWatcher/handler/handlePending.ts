import type {WsResponse} from "../../interface";
import {showToast} from "../util/showToast";

export const handlePending = async ({toast, uid}: WsResponse) => {
    await showToast('info', uid, toast);
};