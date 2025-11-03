import {customElement, property, state} from 'lit/decorators.js';
import {html, LitElement} from 'lit';
import {playgroundStyle} from './style';
import wsClient from '../src';
import {logger} from "../src/util/logger";

type Outcome = 'success' | 'error';
type SuccessType = 'download' | 'alert' | 'forceReload' | '';

@customElement('ep-playground')
export class Playground extends LitElement {
    static styles = [playgroundStyle];

    @property({type: String}) wsUrl = 'ws://localhost:8080/realtime';
    @property({type: String}) authToken = '';

    @state() private connecting = false;
    @state() private connected = false;

    // Defaults für „Form“-Bereich (bleibt erhalten)
    @state() private pending = true;
    @state() private outcome: Outcome = 'success';
    @state() private delayMs = 800;

    @state() private successType: SuccessType = 'download';
    @state() private downloadVariant: 'url' | 'base64' | 'content' | 'auto' = 'auto';
    @state() private filename = '';
    @state() private url = 'https://www.dev.ep-infonet.com/assets/img/y_Qx54tf38-400.avif';
    @state() private base64 = 'SGVsbG8sIFdvcmxkIQ==';
    @state() private mime = 'text/plain';
    @state() private content = 'id,name\n1,Alice\n2,Bob\n';
    @state() private message = 'download.ready';

    @state() private toastPending = 'download.starting';
    @state() private toastSuccess = 'download.ready';
    @state() private toastError = 'download.error';

    private client: ReturnType<typeof wsClient> | null = null;
    private msgListenerAttached = false;

    private pushLog = (msg: string, obj?: any) => {
        const time = new Date().toISOString().split('T')[1].replace('Z', '');
        logger.log(`${time}  ${msg}`, obj ?? '');
    };

    private connect = async () => {
        if (this.connecting || this.connected) return;
        this.connecting = true;
        try {
            this.client = wsClient({
                url: this.wsUrl,
                authToken: this.authToken || undefined,
            });
            if (!this.msgListenerAttached) {
                this.client!.on('message', (e) => {
                    // Alle eingehenden Server-Messages in der Konsole zeigen (z. B. „Chat“-ähnlich)
                    try {
                        const data = JSON.parse((e as MessageEvent).data);
                        logger.log('[WS message]', data);
                    } catch {
                        logger.log('[WS message]', (e as MessageEvent).data);
                    }
                });
                this.msgListenerAttached = true;
            }
            await this.client!.ready();
            this.connected = true;
            this.pushLog('Connected', {url: this.wsUrl});
        } catch (e) {
            this.pushLog('Connect failed', e);
            logger.error('connect failed', e);
        } finally {
            this.connecting = false;
        }
    };

    private softClose = () => {
        if (!this.client) return;
        this.client.close(true);
        this.connected = false;
        this.pushLog('Soft close (release)');
    };

    private hardClose = () => {
        if (!this.client) return;
        this.client.close(false, 1000, 'demo hard close');
        this.connected = false;
        this.pushLog('Hard close (storage cleared)');
    };

    private buildPayload = (overrides?: Partial<{
        type: SuccessType;
        pending: boolean;
        outcome: Outcome;
        delayMs: number;
        variant: 'url' | 'base64' | 'content' | 'auto';
        msg: string;
    }>) => {
        const id = crypto.randomUUID();
        const type = overrides?.type ?? this.successType;
        const pending = overrides?.pending ?? this.pending;
        const outcome = overrides?.outcome ?? this.outcome;
        const delayMs = overrides?.delayMs ?? this.delayMs;

        const data: any = {
            sim: { pending, outcome, delayMs },
            toastPending: this.toastPending,
            toastSuccess: this.toastSuccess,
            toastError: this.toastError,
        };

        if (type) {
            data.type = type;
            if (type === 'download') {
                const variant = overrides?.variant ?? this.downloadVariant;
                if (variant === 'url') {
                    data.url = this.url;
                    data.filename = this.filename || '';
                } else if (variant === 'base64') {
                    data.base64 = this.base64;
                    data.mime = this.mime;
                    data.filename = this.filename || '';
                } else if (variant === 'content') {
                    data.content = this.content;
                    data.mime = this.mime;
                    data.filename = this.filename || '';
                }
                // 'auto' → Server liefert Demo-CSV
            } else if (type === 'alert' || type === 'forceReload') {
                data.msg = overrides?.msg ?? this.message;
            }
        }

        return { id, data };
    };

    private ensureConnected = async () => {
        if (!this.client || !this.client.isOpen()) {
            await this.connect();
        }
        return this.client && this.client.isOpen();
    };

    private sendPayload = async (payload: {id: string; data: any}) => {
        if (!(await this.ensureConnected())) return;
        try {
            this.client!.send(JSON.stringify(payload), {persist: true});
            this.pushLog('Sent', payload);
        } catch (e) {
            this.pushLog('Send failed', e);
            logger.error('send failed', e);
        }
    };

    // —— Quick Sections —— //

    // 1) Nur Typen (download / alert / forceReload) – mit vernünftigen Defaults
    private sendType = async (type: SuccessType) => {
        const payload = this.buildPayload({
            type,
            pending: type === 'download',  // Download zeigt schön pending→success per Default
            outcome: 'success',
            delayMs: type === 'download' ? 500 : 0,
            variant: 'auto',
            msg: type === 'alert' ? 'alert.hello' : type === 'forceReload' ? 'reload.confirm' : this.message,
        });
        await this.sendPayload(payload);
    };

    // 2) States durchgehen (unabhängig vom Typ) – wir nutzen type:'' oder aktuellen Type
    //    Für einfache Konsolen-Tests ohne Aktionen kannst du type:'' setzen.
    private sendState = async (state: 'pending->success' | 'pending->error' | 'success' | 'error') => {
        const map = {
            'pending->success': {pending: true, outcome: 'success' as Outcome, delayMs: 800},
            'pending->error':   {pending: true, outcome: 'error'   as Outcome, delayMs: 800},
            'success':          {pending: false, outcome: 'success' as Outcome, delayMs: 0},
            'error':            {pending: false, outcome: 'error'   as Outcome, delayMs: 0},
        }[state];

        // Für „nur Console“ ohne Actions: type leer lassen
        const payload = this.buildPayload({ type: '', ...map });
        // Optionale freie Textantwort (Server zeigt sie z. B. als toast/msg); hier egal → wir loggen nur
        payload.data.msg = `state.${state}`;
        await this.sendPayload(payload);
    };

    // 3) Timeouts (0 / 100 / 1000 / 4000) – nutzt aktuellen Typ/Outcome/Pending
    private sendTimeout = async (delayMs: number) => {
        const payload = this.buildPayload({ delayMs });
        await this.sendPayload(payload);
    };

    // Form-„Send“ wie gehabt
    private send = async () => {
        const payload = this.buildPayload();
        await this.sendPayload(payload);
    };

    render() {
        return html`
            <div class="grid">
                <div class="row card">
                    <div class="col-8">
                        <label>WS URL</label>
                        <input type="text" .value=${this.wsUrl} @input=${(e: any) => this.wsUrl = e.target.value}/>
                    </div>
                    <div class="col-4">
                        <label>Auth Token (optional)</label>
                        <input type="text" .value=${this.authToken}
                               @input=${(e: any) => this.authToken = e.target.value}/>
                    </div>

                    <div class="col-12 stack">
                        <button class="btn primary" ?disabled=${this.connecting || this.connected}
                                @click=${this.connect}>Connect
                        </button>
                        <button class="btn" ?disabled=${!this.connected} @click=${this.softClose}>Close (soft)</button>
                        <button class="btn red" ?disabled=${!this.connected} @click=${this.hardClose}>Close (hard)
                        </button>
                        <span class="muted">${this.connected ? 'Status: connected' : (this.connecting ? 'Status: connecting…' : 'Status: idle')}</span>
                    </div>
                </div>


                <!-- Sektion 1: Nur Typen -->
                <div class="row card">
                    <fieldset class="col-12">
                        <legend>Typen</legend>
                        <div class="row">
                            <div class="col-12 stack">
                                <button class="btn" @click=${() => this.sendType('download')}>download
                                    (pending→success)
                                </button>
                                <button class="btn" @click=${() => this.sendType('alert')}>alert (konsole & ggf.
                                    toast)
                                </button>
                                <button class="btn" @click=${() => this.sendType('forceReload')}>forceReload (konsole &
                                    ggf. confirm)
                                </button>
                            </div>
                        </div>
                        <span class="muted">Sendet nur den jeweiligen <code>data.type</code> mit sinnvollen Defaults.</span>
                    </fieldset>
                </div>

                <!-- Sektion 2: States -->
                <div class="row card">
                    <fieldset class="col-12">
                        <legend>States</legend>
                        <div class="row">
                            <div class="col-12 stack">
                                <button class="btn" @click=${() => this.sendState('pending->success')}>pending →
                                    success
                                </button>
                                <button class="btn" @click=${() => this.sendState('pending->error')}>pending → error
                                </button>
                                <button class="btn" @click=${() => this.sendState('success')}>success (no pending)
                                </button>
                                <button class="btn red" @click=${() => this.sendState('error')}>error (no pending)
                                </button>
                            </div>
                        </div>
                        <span class="muted">Für reine Console-Tests wird hier <code>type:""</code> gesendet, damit keine Actions greifen.</span>
                    </fieldset>
                </div>

                <!-- Sektion 3: Timeouts -->
                <div class="row card">
                    <fieldset class="col-12">
                        <legend>Timeouts</legend>
                        <div class="row">
                            <div class="col-12 stack">
                                <button class="btn" @click=${() => this.sendTimeout(0)}>0 ms</button>
                                <button class="btn" @click=${() => this.sendTimeout(100)}>100 ms</button>
                                <button class="btn" @click=${() => this.sendTimeout(1000)}>1000 ms</button>
                                <button class="btn" @click=${() => this.sendTimeout(4000)}>4000 ms</button>
                            </div>
                        </div>
                        <span class="muted">Nutzt aktuelle Auswahl von Typ/State, ändert nur die Verzögerung.</span>
                    </fieldset>
                </div>

                <div class="row card">
                    <fieldset class="col-12">
                        <legend>Simulation</legend>
                        <div class="row">
                            <div class="col-3">
                                <label>Pending</label>
                                <select .value=${String(this.pending)}
                                        @change=${(e: any) => this.pending = e.target.value === 'true'}>
                                    <option value="true">true</option>
                                    <option value="false">false</option>
                                </select>
                            </div>
                            <div class="col-3">
                                <label>Outcome</label>
                                <select .value=${this.outcome} @change=${(e: any) => this.outcome = e.target.value}>
                                    <option value="success">success</option>
                                    <option value="error">error</option>
                                </select>
                            </div>
                            <div class="col-3">
                                <label>Delay (ms)</label>
                                <input type="number" min="0" .value=${String(this.delayMs)}
                                       @input=${(e: any) => this.delayMs = Number(e.target.value)}/>
                            </div>
                            <div class="col-3">
                                <label>Success Type</label>
                                <select .value=${this.successType}
                                        @change=${(e: any) => this.successType = e.target.value}>
                                    <option value="download">download</option>
                                    <option value="alert">alert</option>
                                    <option value="forceReload">forceReload</option>
                                    <option value="">(none)</option>
                                </select>
                            </div>
                        </div>

                        ${this.successType === 'download' ? html`
                            <div class="row">
                                <div class="col-3">
                                    <label>Variante</label>
                                    <select .value=${this.downloadVariant}
                                            @change=${(e: any) => this.downloadVariant = e.target.value}>
                                        <option value="auto">auto (Server-CSV)</option>
                                        <option value="url">url</option>
                                        <option value="base64">base64</option>
                                        <option value="content">content</option>
                                    </select>
                                </div>
                                <div class="col-3">
                                    <label>Filename</label>
                                    <input type="text" placeholder="optional" .value=${this.filename}
                                           @input=${(e: any) => this.filename = e.target.value}/>
                                </div>
                                <div class="col-6">
                                    <label>MIME</label>
                                    <input type="text" .value=${this.mime}
                                           @input=${(e: any) => this.mime = e.target.value}/>
                                </div>

                                ${this.downloadVariant === 'url' ? html`
                                    <div class="col-12">
                                        <label>URL</label>
                                        <input type="text" .value=${this.url}
                                               @input=${(e: any) => this.url = e.target.value}/>
                                    </div>
                                ` : this.downloadVariant === 'base64' ? html`
                                    <div class="col-12">
                                        <label>Base64</label>
                                        <textarea .value=${this.base64}
                                                  @input=${(e: any) => this.base64 = e.target.value}></textarea>
                                    </div>
                                ` : this.downloadVariant === 'content' ? html`
                                    <div class="col-12">
                                        <label>Content</label>
                                        <textarea .value=${this.content}
                                                  @input=${(e: any) => this.content = e.target.value}></textarea>
                                    </div>
                                ` : null}
                            </div>
                        ` : null}

                        ${this.successType === 'alert' || this.successType === 'forceReload' ? html`
                            <div class="row">
                                <div class="col-12">
                                    <label>Message (Key/Text)</label>
                                    <input type="text" .value=${this.message}
                                           @input=${(e: any) => this.message = e.target.value}/>
                                </div>
                            </div>
                        ` : null}

                        <div class="row">
                            <div class="col-4">
                                <label>Toast Pending</label>
                                <input type="text" .value=${this.toastPending}
                                       @input=${(e: any) => this.toastPending = e.target.value}/>
                            </div>
                            <div class="col-4">
                                <label>Toast Success</label>
                                <input type="text" .value=${this.toastSuccess}
                                       @input=${(e: any) => this.toastSuccess = e.target.value}/>
                            </div>
                            <div class="col-4">
                                <label>Toast Error</label>
                                <input type="text" .value=${this.toastError}
                                       @input=${(e: any) => this.toastError = e.target.value}/>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-12 stack">
                                <button class="btn primary" @click=${this.send}>Send</button>
                                <span class="muted">Send persistiert Verbindung & Nachricht; Watcher zeigt Pending/Success/Error und führt Aktionen aus.</span>
                            </div>
                        </div>
                    </fieldset>
                </div>
            </div>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ep-playground': Playground;
    }
}
