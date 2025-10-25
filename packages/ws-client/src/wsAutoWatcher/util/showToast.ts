import type {TToastType} from "@electronicpartnerio/uic/bundle/component/toast/interface";
import {translateSafe} from "./translateSafe";
import {toastFactory} from "@electronicpartnerio/uic";

const toast = toastFactory();

export const showToast = async (appearance: TToastType, uid: string, msg?: string, ) => {
    if (!msg) return;
    const transMsg: string = await translateSafe(msg)
    toast.add(transMsg, appearance, `toast-${uid}-${Date.now()}`);
};