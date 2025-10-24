import { customElement, state, property } from 'lit/decorators.js';
import { css, html, LitElement } from 'lit';
import WebSocketService from "../src";
import {toastFactory} from "@electronicpartnerio/uic";
import type {ToastAdapter} from "../src/interface";
import {WebSocketAutopilot} from "../src/WebSocketAutopilot";

@customElement('ep-playground')
export class Playground extends LitElement {
    static styles = css`
    :host { display:block; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .row { display:flex; gap:.5rem; flex-wrap: wrap; margin-bottom: .75rem; }
    button { padding:.5rem .75rem; border-radius:.5rem; border:1px solid #ccc; background:#fff; cursor:pointer; }
    button:hover { background:#f7f7f7; }
    .field { display:flex; gap:.5rem; align-items: center; margin-bottom: .75rem; }
    .field input { width: 360px; padding:.4rem .5rem; border:1px solid #ccc; border-radius:.4rem; }
    .meta { color:#666; font-size:.9rem; }
    .pill { display:inline-block; padding:.15rem .5rem; border-radius:999px; border:1px solid #ddd; background:#fafafa; margin-left:.25rem; }
  `;

    @property({ type: String }) wsUrl: string = 'ws://localhost:3013/ws';
    @property({ type: String }) token: string = 'dev';

    @state() private lastJobId: string | null = null;
    @state() private lastCorrelationId: string | null = null;
    @state() private connected = false;

    private offMessage?: () => void;

    render() {
        return html`
      <div class="field">
        <label>WS URL</label>
        <input .value=${this.wsUrl} @input=${(e: any) => (this.wsUrl = e.target.value)} />
      </div>
      <div class="field">
        <label>Token</label>
        <input .value=${this.token} @input=${(e: any) => (this.token = e.target.value)} />
        <span class="meta">
          Status:
          <span class="pill">${this.connected ? 'connected-ish' : 'idle'}</span>
          ${this.lastJobId ? html`<span class="pill">lastJob: ${this.lastJobId}</span>` : ''}
        </span>
      </div>

      <div class="row">
        <button @click=${this.connect}>Connect</button>
        <button @click=${() => this.startJob(false)}>Start Job</button>
        <button @click=${() => this.startJob(true)}>Start Job (fail)</button>
        <button @click=${this.subscribeLast} ?disabled=${!this.lastJobId}>Subscribe last job</button>
        <button @click=${this.echo}>Echo</button>
        <button @click=${this.close}>Close</button>
      </div>
    `;
    }

    connectedCallback() {
        super.connectedCallback();
        window.EP.wsService = new WebSocketAutopilot({
            url: this.wsUrl,
        });
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.offMessage?.();
        this.offMessage = undefined;
    }

    // ToastAdapter → mapped auf eure toastFactory (neuen Toast immer rendern; alte per uid verstecken)
    private toast = toastFactory();
    private toastAdapter: ToastAdapter = {
        showPending: (id, msg) => { this.toast.hide(id); this.toast.add(String(msg ?? '…'), 'warning', id); },
        showSuccess: (id, msg) => { this.toast.hide(id); this.toast.add(String(msg ?? 'Fertig.'), 'success', id); },
        showError:   (id, msg) => { this.toast.hide(id); this.toast.add(String(msg ?? 'Fehlgeschlagen.'), 'error', id); },
    };

    // ---------- UI Actions (arrow functions) ----------

    private connect = async () => {
        // init ist idempotent – mehrfaches Klicken ist okay
        WebSocketService.init({
            url: this.wsUrl,
            getAuthToken: async () => this.token,
            toast: this.toastAdapter,
            heartbeatMs: 10_000,
            idleCloseMs: 60_000,
        });

        // Messages lauschen
        if (!this.offMessage) {
            this.offMessage = WebSocketService.instance.onMessage((msg: any) => {
                this.pushLog(msg);
                if (msg?.type === 'ack' && msg?.jobId) {
                    this.lastJobId = msg.jobId ?? null;
                    this.lastCorrelationId = msg.correlationId ?? null;
                }
            });
        }

        // ein Ping hilft, Aktivität zu erzeugen (optional)
        try {
            await WebSocketService.instance.sendRaw({ type: 'ping', ts: Date.now() });
        } catch { /* noop */ }

        this.connected = true;
        this.pushLog('OPEN requested (watch console for real WS lifecycle)');
    };

    private close = () => {
        try { WebSocketService.instance.close(); } catch {}
        this.connected = false;
        this.pushLog('CLOSE requested');
    };

    private startJob = async (fail = false) => {
        try {
            const res = await WebSocketService.instance.sendRequest(
                { type: 'printTag.start', payload: { fail } },
                {
                    trackJob: true,
                    toastPendingText: 'Wird gedruckt…',
                    toastSuccessText: 'Fertig!',
                    toastErrorText: 'Fehlgeschlagen.',
                }
            );
            this.pushLog({ info: 'job final', res });
        } catch (e) {
            this.pushLog({ error: String(e) });
        }
    };

    private subscribeLast = async () => {
        if (!this.lastJobId) {
            this.pushLog('No lastJobId – starte erst einen Job');
            return;
        }
        await WebSocketService.instance.sendRaw({ type: 'job.subscribe', jobId: this.lastJobId });
        this.pushLog({ info: 'subscribe sent', jobId: this.lastJobId });
    };

    private echo = async () => {
        try {
            const res = await WebSocketService.instance.sendRequest({ type: 'echo', payload: { hello: 'world' } });
            this.pushLog({ info: 'echo response', res });
        } catch (e) {
            this.pushLog({ error: String(e) });
        }
    };

    // ---------- utils ----------

    private pushLog = (entry: unknown) => {
        const t = new Date().toLocaleTimeString();
        console.log( t, entry )
        // Auto-Scroll handled by <pre> CSS overflow
    };
}

type PrintPayload = {
    template: string;
    fields: Record<string, any>;
};

const startPrintJob = async (payload: PrintPayload) => {
    const svc = WebSocketService.instance;
    return await svc.sendRequest(
        { type: "print.start", payload },
        {
            trackJob: true,
            toastPendingText: "Druck wird vorbereitet…",
            toastSuccessText: (msg) =>
                msg?.downloadUrl ? "Druck fertig – Download startet." : "Druck fertig.",
            toastErrorText: (err) => `Druck fehlgeschlagen: ${err?.message ?? "Unbekannter Fehler"}`,
            // timeoutMs: 15000 // optional, nur für unmittelbare Antworten sinnvoll
        }
    );
}