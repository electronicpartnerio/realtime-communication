export type Json = Record<string, any>;

export type ToastAdapter = {
    showPending: (id: string, message: string) => void;
    showSuccess: (id: string, message: string) => void;
    showError: (id: string, message: string) => void;
    update?: (id: string, message: string) => void; // optional
};

export type WSOptions = {
    url: string;
    protocols?: string | string[];
    getAuthToken?: () => string | Promise<string>;
    heartbeatMs?: number; // default 25_000
    idleCloseMs?: number; // default 60_000 (wenn keine Jobs/Listener/Requests)
    toast?: ToastAdapter; // optional
    storageKey?: string; // default 'ws.jobs'
};

export type SendOptions = {
    /** Optional event type to send, else include in payload yourself */
    type?: string;
    /** Show a "pending" toast immediately */
    toastPendingText?: string;
    /** Show success toast when done; text or function using payload/result */
    toastSuccessText?: string | ((data: any) => string);
    /** Show error toast */
    toastErrorText?: string | ((err: any) => string);
    /** Mark as long-running job (will track jobId and survive reloads) */
    trackJob?: boolean;
    /** Optional timeout for immediate request/response flows (ms) */
    timeoutMs?: number;
};

export type PendingRequest = {
    resolve: (data: any) => void;
    reject: (err: any) => void;
    timer?: number;
};

export type JobRecord = {
    jobId: string;
    status: "pending" | "done" | "error";
    correlationId?: string;
    type?: string;
    startedAt: number;
    updatedAt: number;
    downloadUrl?: string;
    error?: string;
    toastId?: string;
    toastTexts?: Pick<SendOptions, "toastPendingText" | "toastSuccessText" | "toastErrorText">;
};

export type TToastVariant = "info" | "success" | "warning" | "error";
export type TToastPreset = [key: string, variant: TToastVariant];

export type RegisterOptions = {
    type: string; // e.g. "printTag"
    toast?: {
        showPending?: TToastPreset;
        showSuccess?: TToastPreset;
        showError?:   TToastPreset;
    };
};

export type AutopilotGlobalOptions = {
    url: string;
    protocols?: string | string[];
    getAuthToken?: () => string | Promise<string>;
    heartbeatMs?: number;
    idleCloseMs?: number;
    wsStorageKey?: string; // for WebSocketService job storage (default 'ws.jobs')
    cacheKeyBase?: string; // for Autopilot client cache (default 'rc')
    // your existing lit i18n (async); we’ll prefetch but show synchronously
    i18n?: { g: (key: string, params?: Record<string, any>) => Promise<string> };
    eagerConnect?: boolean; // default false: let WS sleep until first activity
};

export type OutcomeRecord = { type: "success" | "error"; count: number; at: number };

export type CacheShape = {
    pendingJobs?: string[];
    lastOutcome?: OutcomeRecord;
    lastOutcomeMsg?: any;
};