import {toast} from "../../cache";
import {TOAST_ID_PREFIX} from "../../constant";

export const hideToast = ( id: string ) => {
    toast.hide(TOAST_ID_PREFIX + id)
};
