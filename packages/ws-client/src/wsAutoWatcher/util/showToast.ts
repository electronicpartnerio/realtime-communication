import type {TToastType} from "@electronicpartnerio/uic/bundle/component/toast/interface";
import {translateSafe} from "./translateSafe";
import {toast} from "../../cache";
import {TOAST_ID_PREFIX} from "../../constant";

export const showToast = async (appearance: TToastType, id: string, msg?: string ) => {
    if (!msg) return;
    const transMsg: string = await translateSafe(msg)
    toast.add(transMsg, appearance, TOAST_ID_PREFIX + id);
};
