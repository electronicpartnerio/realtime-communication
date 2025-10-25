export type WSData = string | ArrayBuffer | ArrayBufferView | Blob;

export type EventMap = {
    open: Event;
    message: MessageEvent;
    close: CloseEvent;
    error: Event;
};
export type EventName = keyof EventMap;
export type ListenerOf<K extends EventName> = (e: EventMap[K]) => void;
export type ListenersMap = { [K in EventName]: Set<ListenerOf<K>> };

export interface WsServiceOptions {
    url: string;
    authToken?: string;
    protocols?: string | string[];
    appendAuthToQuery?: boolean; // default: true
    /** Dependency injection for tests (e.g., a MockWebSocket) */
    wsImpl?: typeof WebSocket;
}

export interface WsService {
    send: (data: WSData, sendOpts?: SendOptions) => void;
    ready: () => Promise<void>;
    close: (soft?: boolean, code?: number, reason?: string) => void;
    hardClose: (code?: number, reason?: string) => void;
    release: () => void;
    on:  <K extends EventName>(event: K, cb: (e: EventMap[K]) => void) => void;
    off: <K extends EventName>(event: K, cb: (e: EventMap[K]) => void) => void;
    isOpen: () => boolean;
    socket: () => WebSocket | null;
}

export interface SendOptions {
    persist?: boolean; // beim Senden in Session speichern
}

export type StoredEntry = WsServiceOptions;
export type StoredRegistry = Record<string, StoredEntry>;

export type RegistryEntry = { client: WsService; ref: number };


export type MessageState = 'send' | 'pending' | 'success' | 'error';

export interface WatchedMessage {
    id: string;
    url: string;            // zugehörige Socket-URL
    payload: any;
    state: MessageState;
    timestamp: number;
}

export type WatchedRegistry = Record<string, WatchedMessage>;