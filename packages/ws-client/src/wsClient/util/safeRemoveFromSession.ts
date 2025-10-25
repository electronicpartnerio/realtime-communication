import {safeReadAll} from "../../util/safeReadAll";
import {WS_REGISTRY_KEY} from "../../constant";

export const safeRemoveFromSession = (normalizedKey: string) => {
    try {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        const current = safeReadAll();
        if (normalizedKey in current) {
            delete current[normalizedKey];
            sessionStorage.setItem(WS_REGISTRY_KEY, JSON.stringify(current));
        }
    } catch {}
};