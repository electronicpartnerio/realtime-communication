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
export interface WsServiceFunction {
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

export type WsService = WsServiceFunction | null;

export interface SendOptions {
    persist?: boolean; // beim Senden in Session speichern
}

export type StoredEntry = WsServiceOptions;
export type StoredRegistry = Record<string, StoredEntry>;

export type RegistryEntry = { client: WsServiceFunction; ref: number };

export type MessageState = 'send' | 'pending' | 'success' | 'error';

export interface WatchedMessage {
    id: string;
    url: string;            // zugehörige Socket-URL
    payload: any;
    state: MessageState;
    timestamp: number;
}
export type WsResponseState = 'pending' | 'success' | 'error';
export interface WsMessage<T = any> {
    /** Eindeutige Zuordnung zwischen Request und Response */
    id: string;
    /** Payload */
    data: T;
}

export interface WsResponse<T = any> extends WsMessage<T> {
    /** Serverseitiger Status */
    state: WsResponseState;
    /** Optionale Toast-Nachricht (Schlüssel für Übersetzung oder Text) */
    toast?: string;
    timestamp?: number;
}

export type DownloadInput =
    | { url: string; filename?: string; forceFetch?: boolean }
    | { base64: string; mime?: string; filename?: string }
    | { content: string | ArrayBuffer | Uint8Array; mime?: string; filename?: string };

export type LogLevel = 'log' | 'warn' | 'error' | 'info';
export type LoggerConfig = {
    silent?: boolean;       // komplett ausschalten
    env?: string;           // 'development' | 'production' | etc.
};

export type WsLoosePayload = {
    id: string;
    state?: 'send' | 'pending' | 'success' | 'error';
    toastPending?: string;
    data?: any;
    [k: string]: any;
};