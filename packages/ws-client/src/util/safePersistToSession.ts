import {safeReadAll} from "./safeReadAll";
import type {StoredEntry} from "../interface";
import {WS_REGISTRY_KEY} from "../constant";

export const safePersistToSession = (normalizedKey: string, entry: StoredEntry) => {
    try {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        const current = safeReadAll();
        current[normalizedKey] = entry;
        sessionStorage.setItem(WS_REGISTRY_KEY, JSON.stringify(current));
    } catch {}
};