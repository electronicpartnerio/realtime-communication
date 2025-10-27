import {toast} from "../../cache";
import {TOAST_ID_PREFIX} from "../../constant";

export const hideToast = ( id: string ) => {
    console.log( id, document.getElementById(TOAST_ID_PREFIX + id) );
    toast.hide(TOAST_ID_PREFIX + id)
};