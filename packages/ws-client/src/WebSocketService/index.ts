import type {JobRecord, Json, PendingRequest, SendOptions, WSOptions} from "../interface";
import {JobTracker} from "../JobTracker";
import {cryptoRandomId} from "../util/cryptoRandomId";
import {waitFor} from "../util/waitFor";
import {appendQuery} from "../util/appendQuery";

export class WebSocketService {
    private static _instance: WebSocketService | null = null;

    static get instance() {
        if (!this._instance) throw new Error("WebSocketService not initialized. Call WebSocketService.init(opts).");
        return this._instance;
    }

    static init = (opts: WSOptions) => {
        if (!this._instance) this._instance = new WebSocketService(opts);
        return this._instance;
    };

    private ws: WebSocket | null = null;
    private opts: Required<Pick<WSOptions, "url" | "heartbeatMs" | "idleCloseMs" | "storageKey">> &
        Omit<WSOptions, "url" | "heartbeatMs" | "idleCloseMs" | "storageKey">;
    private connecting = false;
    private closedByUser = false;
    private lastActivity = Date.now();
    private heartbeatTimer?: number;
    private idleTimer?: number;
    private backoff = 500; // ms
    private pendingRequests = new Map<string, PendingRequest>();
    private listeners = new Set<(msg: any) => void>();
    private jobTracker: JobTracker;

    private constructor(opts: WSOptions) {
        this.opts = {
            url: opts.url,
            protocols: opts.protocols,
            getAuthToken: opts.getAuthToken,
            heartbeatMs: opts.heartbeatMs ?? 25_000,
            idleCloseMs: opts.idleCloseMs ?? 60_000,
            toast: opts.toast,
            storageKey: opts.storageKey ?? "ws.jobs",
        };
        this.jobTracker = new JobTracker(this.opts.storageKey);
        this.connect();
    }

    // ---------- Public API ----------

    onMessage = (cb: (msg: any) => void) => {
        this.listeners.add(cb);
        this.bumpActivity();
        return () => this.listeners.delete(cb);
    };

    sendRequest = async <T = any>(
        payload: Json,
        options: SendOptions = {}
    ): Promise<T> => {
        await this.ensureOpen();
        const correlationId = cryptoRandomId();
        const envelope: any = {
            ...payload,
            correlationId,
        };
        if (options.type) envelope.type = options.type;

        // Toast pending (optional)
        let toastId: string | undefined;
        if (options.toastPendingText && this.opts.toast) {
            toastId = `toast_${correlationId}`;
            this.opts.toast.showPending(toastId, options.toastPendingText);
        }

        // If it's a long-running job, we expect an early ACK with jobId.
        // We'll resolve the promise when a final 'job.done|job.error' arrives OR when a direct reply arrives.
        const immediate = new Promise<T>((resolve, reject) => {
            const req: PendingRequest = {resolve, reject};
            if (options.timeoutMs) {
                // @ts-ignore
                req.timer = window.setTimeout(() => {
                    this.pendingRequests.delete(correlationId);
                    reject(new Error(`WS request timeout after ${options.timeoutMs}ms`));
                }, options.timeoutMs);
            }
            this.pendingRequests.set(correlationId, req);
        });

        // Track toasts in stored job if server returns jobId
        const toastTexts = {
            toastPendingText: options.toastPendingText,
            toastSuccessText: options.toastSuccessText,
            toastErrorText: options.toastErrorText,
        };

        this.ws!.send(JSON.stringify(envelope));

        // For trackJob we don’t resolve now; we resolve on final server message.
        if (options.trackJob) {
            // The promise will resolve when we receive job.done/job.error mapped to the correlationId
            // or we get a direct response (some backends echo correlation on done too).
        }

        // Attach a one-off augmentation to map ack/job events to this request
        const off = this.onMessage((msg) => {
            const {type, correlationId: cid, jobId, downloadUrl, error} = msg || {};
            if (!cid && !jobId) return;

            // ACK: register job
            if (options.trackJob && cid === correlationId && type === "ack" && jobId) {
                const rec: JobRecord = {
                    jobId,
                    status: "pending",
                    correlationId,
                    type: envelope.type,
                    startedAt: Date.now(),
                    updatedAt: Date.now(),
                    toastId,
                    toastTexts,
                };
                this.jobTracker.upsert(rec);
            }

            // Direct reply path (non-job)
            if (!options.trackJob && cid === correlationId && type && type !== "ack") {
                off();
                const req = this.pendingRequests.get(correlationId);
                if (req) {
                    if (req.timer) clearTimeout(req.timer);
                    this.pendingRequests.delete(correlationId);
                }
                this.finishToastSuccess(toastId, options.toastSuccessText, msg);
                (req?.resolve as any)?.(msg);
            }

            // Final job outcome
            if (options.trackJob && jobId) {
                const rec = this.jobTracker.get(jobId);
                if (!rec) return; // not ours
                if (type === "job.done") {
                    rec.status = "done";
                    rec.updatedAt = Date.now();
                    rec.downloadUrl = downloadUrl;
                    this.jobTracker.upsert(rec);
                    off();
                    this.finishToastSuccess(rec.toastId, rec.toastTexts?.toastSuccessText, msg);
                    this.autoDownload(downloadUrl);
                    // Resolve the original promise if waiting
                    const req = rec.correlationId ? this.pendingRequests.get(rec.correlationId) : undefined;
                    if (req) {
                        if (req.timer) clearTimeout(req.timer);
                        this.pendingRequests.delete(rec.correlationId!);
                        (req.resolve as any)(msg);
                    }
                }
                if (type === "job.error") {
                    rec.status = "error";
                    rec.updatedAt = Date.now();
                    rec.error = error ?? "Unknown error";
                    this.jobTracker.upsert(rec);
                    off();
                    this.finishToastError(rec.toastId, rec.toastTexts?.toastErrorText, msg.error ?? msg);
                    // Reject promise
                    const req = rec.correlationId ? this.pendingRequests.get(rec.correlationId) : undefined;
                    if (req) {
                        if (req.timer) clearTimeout(req.timer);
                        this.pendingRequests.delete(rec.correlationId!);
                        req.reject(new Error(rec.error));
                    }
                }
            }
        });

        return immediate;
    };

    /** Call on app start to re-subscribe to pending jobs after reload/navigation */
    resumePendingJobs = async () => {
        await this.ensureOpen();
        const pendings = this.jobTracker.pending();
        for (const j of pendings) {
            this.sendRaw({type: "job.subscribe", jobId: j.jobId});
            // Optional: show pending toast again after reload
            if (j.toastId && j.toastTexts?.toastPendingText && this.opts.toast) {
                this.opts.toast.showPending(j.toastId, j.toastTexts.toastPendingText);
            }
        }
    };

    /** Manuell schließen (z. B. beim App-Shutdown) */
    close = () => {
        this.closedByUser = true;
        this.clearTimers();
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            this.ws.close(1000, "client-close");
        }
        this.ws = null;
    };

    /** Für sehr generische Sendefälle */
    sendRaw = async (obj: Json) => {
        await this.ensureOpen();
        this.ws!.send(JSON.stringify(obj));
    };

    // ---------- Internals ----------

    private ensureOpen = async () => {
        this.bumpActivity();
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
        if (!this.connecting) this.connect();
        await waitFor(() => this.ws?.readyState === WebSocket.OPEN, 8_000);
    };

    private connect = async () => {
        if (this.connecting || this.closedByUser) return;
        this.connecting = true;
        try {
            const token = this.opts.getAuthToken ? await this.opts.getAuthToken() : undefined;
            const url = token ? appendQuery(this.opts.url, {token}) : this.opts.url;
            this.ws = new WebSocket(url, this.opts.protocols);
            this.ws.onopen = () => {
                this.connecting = false;
                this.backoff = 500;
                this.startHeartbeat();
                this.startIdleTimer();
                // Nach (Re)Connect offene Jobs wieder abonnieren
                this.resumePendingJobs();
            };
            this.ws.onmessage = (ev) => {
                this.bumpActivity();
                let msg: any;
                try {
                    msg = JSON.parse(ev.data);
                } catch {
                    msg = ev.data;
                }
                // pending request by correlationId?
                const cid = msg?.correlationId;
                if (cid && this.pendingRequests.has(cid) && msg?.type && msg.type !== "ack") {
                    // handled in sendRequest listener (to allow job flow)
                    // no-op here
                }
                // broadcast to listeners
                for (const cb of this.listeners) cb(msg);
            };
            this.ws.onclose = () => {
                this.clearTimers();
                this.ws = null;
                if (!this.closedByUser) this.scheduleReconnect();
            };
            this.ws.onerror = () => {
                // Let onclose handle reconnect
            };
        } finally {
            this.connecting = false;
        }
    };

    private scheduleReconnect = () => {
        const delay = Math.min(this.backoff, 10_000) + Math.floor(Math.random() * 250);
        this.backoff = Math.min(this.backoff * 2, 30_000);
        window.setTimeout(() => {
            if (!this.closedByUser) this.connect();
        }, delay);
    };

    private startHeartbeat = () => {
        this.clearHeartbeat();
        // @ts-ignore
        this.heartbeatTimer = window.setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws!.send(JSON.stringify({type: "ping", ts: Date.now()}));
            }
        }, this.opts.heartbeatMs);
    };

    private clearHeartbeat = () => {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }
    };

    private startIdleTimer = () => {
        this.clearIdle();
        // @ts-ignore
        this.idleTimer = window.setInterval(() => {
            const idle = Date.now() - this.lastActivity;
            if (idle > this.opts.idleCloseMs && this.noActiveWork()) {
                this.close();
            }
        }, 5_000);
    };

    private clearIdle = () => {
        if (this.idleTimer) {
            clearInterval(this.idleTimer);
            this.idleTimer = undefined;
        }
    };

    private clearTimers = () => {
        this.clearHeartbeat();
        this.clearIdle();
    };

    private bumpActivity = () => {
        this.lastActivity = Date.now();
    };

    private noActiveWork = () =>
        this.listeners.size === 0 &&
        this.pendingRequests.size === 0 &&
        this.jobTracker.pending().length === 0;

    private finishToastSuccess = (
        toastId?: string,
        text?: SendOptions["toastSuccessText"],
        data?: any
    ) => {
        if (!toastId || !this.opts.toast) return;

        const msg = typeof text === "function" ? text(data) : text || "Fertig.";
        this.opts.toast.showSuccess(toastId, msg);
    };

    private finishToastError = (
        toastId?: string,
        text?: SendOptions["toastErrorText"],
        err?: any
    ) => {
        if (!toastId || !this.opts.toast) return;

        const msg = typeof text === "function" ? text(err) : text || "Fehlgeschlagen.";
        this.opts.toast.showError(toastId, msg);
    };

    private autoDownload = (url?: string) => {
        if (!url) return;

        const a = document.createElement("a");
        a.href = url;
        a.download = ""; // hint for same-origin; cross-origin typically forces navigation
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
    };
}