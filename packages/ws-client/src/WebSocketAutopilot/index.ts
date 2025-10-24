import type {AutopilotGlobalOptions, CacheShape, OutcomeRecord, RegisterOptions} from "../interface";
import {WebSocketService} from "../WebSocketService";
import {toastFactory} from "@electronicpartnerio/uic";
import {t} from "@electronicpartnerio/ep-lit-translate";

export class WebSocketAutopilot {
    private readonly cacheBaseKey: string;
    private readonly toast = toastFactory();
    private readonly registered = new Map<string, RegisterOptions>(); // jobType -> RegisterOptions
    private readyWS = false;

    constructor(private opts: AutopilotGlobalOptions) {
        this.cacheBaseKey = opts.cacheKeyBase ?? "rc";

        // Init WS once with global endpoint/auth (idempotent)
        WebSocketService.init({
            url: opts.url,
            protocols: opts.protocols,
            getAuthToken: opts.getAuthToken,
            heartbeatMs: opts.heartbeatMs ?? 20_000,
            idleCloseMs: opts.idleCloseMs ?? 60_000,
            storageKey: opts.wsStorageKey ?? "ws.jobs",
        });

        // Lazy-attach handlers and resume; if eagerConnect, do it immediately
        if (opts.eagerConnect) this.ensureWsReady().catch(() => {
        });
    }

    /** Feature registration: only type + toast presets */
    register = async (ro: RegisterOptions) => {
        this.registered.set(ro.type, ro);
        await this.ensureWsReady()

        return {
            send: async (payload: any) => {
                // convention: "<type>.start"
                return await WebSocketService.instance.sendRequest(
                    {type: `${ro.type}.start`, payload},
                    {trackJob: true}
                );
            },
        };
    };

    // ---------------- internals ----------------

    private ensureWsReady = async () => {
        if (this.readyWS) return;
        this.readyWS = true;

        // attach once
        WebSocketService.instance.onMessage(this.handleMessage);

        // resume pending jobs (works even if none exist; WS will open/close as needed)
        await WebSocketService.instance.resumePendingJobs();
    };

    private handleMessage = async (msg: any) => {
        const fullType: string | undefined = msg?.type;
        const jobId: string | undefined = msg?.jobId;

        let jobType = this.extractJobType(fullType);
        if (!jobType && (fullType === 'ack' || fullType === 'job.update' || fullType === 'job.done' || fullType === 'job.error')) {
            if (typeof msg?.jobType === 'string') jobType = msg.jobType; // Fallback
        }
        if (!jobType) return;

        const reg = this.registered.get(jobType);
        if (!reg) return;

        const isAck = fullType === 'ack' || fullType === `${jobType}.ack`;
        const isUpdate = fullType === 'job.update' || fullType === `${jobType}.job.update`;
        const isDone = fullType === 'job.done' || fullType === `${jobType}.job.done`;
        const isError = fullType === 'job.error' || fullType === `${jobType}.job.error`;

        if (isAck && jobId) {
            this.addPending(jobType, jobId);
            await this.showSingleToast(jobType, "pending");
            return;
        }

        if (isUpdate && jobId) {
            return; // optional progress handling
        }

        if (isDone && jobId) {
            this.removePending(jobType, jobId);
            this.markOutcome(jobType, "success", msg);
            await this.showOutcomeToast(jobType, "success", msg);
            return;
        }

        if (isError && jobId) {
            this.removePending(jobType, jobId);
            this.markOutcome(jobType, "error", msg);
            await this.showOutcomeToast(jobType, "error", msg);
            return;
        }
    };

    // ---------- cache per jobType ----------

    private cacheKey = (jobType: string) => `${this.cacheBaseKey}:${jobType}`;

    private readCache = (jobType: string): CacheShape => {
        try {
            return JSON.parse(localStorage.getItem(this.cacheKey(jobType)) || "{}");
        } catch {
            return {};
        }
    };
    private writeCache = (jobType: string, data: CacheShape) =>
        localStorage.setItem(this.cacheKey(jobType), JSON.stringify(data));

    private addPending = (jobType: string, jobId: string) => {
        const c = this.readCache(jobType);
        const set = new Set([...(c.pendingJobs || []), jobId]);
        c.pendingJobs = Array.from(set);
        this.writeCache(jobType, c);
    };
    private removePending = (jobType: string, jobId: string) => {
        const c = this.readCache(jobType);
        c.pendingJobs = (c.pendingJobs || []).filter(id => id !== jobId);
        this.writeCache(jobType, c);
    };
    private markOutcome = (jobType: string, type: OutcomeRecord["type"], lastMsg?: any) => {
        const c = this.readCache(jobType);
        const last = c.lastOutcome;
        c.lastOutcome = last && last.type === type
            ? {...last, count: last.count + 1, at: Date.now()}
            : {type, count: 1, at: Date.now()};
        c.lastOutcomeMsg = lastMsg;           // <<— kompletter msg
        this.writeCache(jobType, c);
    };

    private clearOutcome = (jobType: string) => {
        const c = this.readCache(jobType);
        delete (c as any).lastOutcome;
        delete (c as any).lastOutcomeMsg;     // <<— aufräumen
        this.writeCache(jobType, c);
    };

    // ---------- boot toasts on (first) register ----------
    private showBootToasts = async (jobType: string) => {
        const c = this.readCache(jobType) as any;

        if ((c.pendingJobs?.length || 0) > 0) {
            await this.showSingleToast(jobType, "pending");
        }
        if (c.lastOutcome) {
            await this.showOutcomeToast(jobType, c.lastOutcome.type, c.lastOutcomeMsg); // <<—
            this.clearOutcome(jobType);
        }
    };

    // ---------- toasts (always new; hide previous by uid) ----------
    private showSingleToast = async (jobType: string, kind: "pending" | "success" | "error") => {
        const reg = this.registered.get(jobType);
        if (!reg) return;
        const preset = kind === "pending" ? reg.toast?.showPending
            : kind === "success" ? reg.toast?.showSuccess : reg.toast?.showError;
        if (!preset) return;

        const [key, variant] = preset;
        const text = await t.g(key);   // <<— keine params
        const uid = this.toastUid(jobType, kind);

        this.toast.hide(uid);
        this.toast.add(text, variant as any, uid);
    };

    private showOutcomeToast = async (
        jobType: string,
        kind: "success" | "error",
        paramsMsg?: any                       // <<— kompletter msg
    ) => {
        const reg = this.registered.get(jobType);
        if (!reg) return;
        const preset = kind === "success" ? reg.toast?.showSuccess : reg.toast?.showError;
        if (!preset) return;

        const [key, variant] = preset;
        const text = await t.g(key, paramsMsg); // <<— params = msg
        const uid = this.toastUid(jobType, kind);

        this.toast.hide(uid);
        this.toast.add(text, variant as any, uid);
    };

    private toastUid = (jobType: string, kind: "pending" | "success" | "error") =>
        `rc:${jobType}:${kind}`;

    // ---------- i18n (sync render; async prefetch) ----------
    private primeI18n = async (ro: RegisterOptions) => {
        const keys = [
            ro.toast?.showPending?.[0],
            ro.toast?.showSuccess?.[0],
            ro.toast?.showError?.[0],
        ].filter(Boolean) as string[];

        await Promise.all(keys.map(async (k) => {
            const txt = await t.g(k);
        })).catch(() => {
        });
    };

    private kWithParams = (key: string, params?: Record<string, any>) =>
        !params ? key : `${key}::${Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&")}`;

    // ---------- utils ----------

    private extractJobType = (type?: string) => {
        if (!type) return undefined;
        const i = type.indexOf(".");
        return i > 0 ? type.slice(0, i) : type;
    };
}