import type {WsResponse} from "../../interface";
import {showToast} from "../util/showToast";

export const handlePending = async ({toast, id}: WsResponse) => {
    await showToast('info', id, toast);
};