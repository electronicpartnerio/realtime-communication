import type {StoredRegistry} from "../interface";
import {WS_REGISTRY_KEY} from "../constant";

export const safeReadAll = (): StoredRegistry => {
    try {
        if (!window.sessionStorage) return {};
        const raw = sessionStorage.getItem(WS_REGISTRY_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as StoredRegistry;
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch { return {}; }
};