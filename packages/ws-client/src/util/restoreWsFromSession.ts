import {wsClient} from "../wsClient";
import type {StoredEntry, WsService} from "../interface";
import {safeReadAll} from "./safeReadAll";

export const restoreWsFromSession = (): WsService[] => {
    const data = safeReadAll();
    const clients: WsService[] = [];

    Object.entries(data).forEach(([_, entry]: [string, StoredEntry]) => {
        if(!entry) return;

        const client = wsClient({
            url: entry.url,
            authToken: entry.authToken,
            protocols: entry.protocols,
            appendAuthToQuery: entry.appendAuthToQuery ?? true,
            wsImpl: entry?.wsImpl
        });
        clients.push(client!);
    });

    return clients;
};