import {customElement, property, state} from 'lit/decorators.js';
import {html, LitElement} from 'lit';
import {playgroundStyle} from "./style";
import wsClient, {wsAutoWatcher} from "../src";

const watcher = wsAutoWatcher();

type Outcome = 'success' | 'error';
type SuccessType = 'download' | 'alert' | 'forceReload' | '';

@customElement('ep-playground')
export class Playground extends LitElement {
    static styles = [ playgroundStyle];

    // ---- Konfig ----
    @property({type: String}) wsUrl = 'ws://localhost:8080/realtime';
    @property({type: String}) authToken = '';

    // ---- UI State ----
    @state() private connecting = false;
    @state() private connected = false;

    // Simulation/Antwort-Steuerung
    @state() private pending = true;
    @state() private outcome: Outcome = 'success';
    @state() private delayMs = 800;

    // Success-spezifisch
    @state() private successType: SuccessType = 'download';
    @state() private downloadVariant: 'url' | 'base64' | 'content' | 'auto' = 'auto';
    @state() private filename = '';
    @state() private url = 'https://www.dev.ep-infonet.com/assets/img/y_Qx54tf38-400.avif';
    @state() private base64 = 'SGVsbG8sIFdvcmxkIQ=='; // "Hello, World!"
    @state() private mime = 'text/plain';
    @state() private content = 'id,name\n1,Alice\n2,Bob\n';
    @state() private message = 'download.ready'; // alert/forceReload msg (oder Toast-Text)

    // Toast Keys
    @state() private toastPending = 'download.starting';
    @state() private toastSuccess = 'download.ready';
    @state() private toastError = 'download.error';

    private client: ReturnType<typeof wsClient> | null = null;

    private pushLog = (msg: string, obj?: any) => {
        const time = new Date().toISOString().split('T')[1].replace('Z', '');
        console.log(  `${time}  ${msg} obj:`, obj )
    };

    private connect = async () => {
        if (this.connecting || this.connected) return;
        this.connecting = true;
        try {
            this.client = wsClient({
                url: this.wsUrl,
                authToken: this.authToken || undefined,
            });
            await this.client?.ready();
            this.connected = true;
            this.pushLog('Connected', {url: this.wsUrl});
        } catch (e) {
            this.pushLog('Connect failed', e);
            console.error('connect failed', e);
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

    private send = async () => {
        if (!this.client) await this.connect();
        if (!this.client) return;

        const uid = crypto.randomUUID();

        const data: any = {
            sim: {
                pending: this.pending,
                outcome: this.outcome,
                delayMs: this.delayMs,
            },
            toastPending: this.toastPending,
            toastSuccess: this.toastSuccess,
            toastError: this.toastError,
        };

        // Success-Typ einbetten
        if (this.successType) {
            data.type = this.successType;
            if (this.successType === 'download') {
                if (this.downloadVariant === 'url') {
                    data.url = this.url;
                } else if (this.downloadVariant === 'base64') {
                    data.base64 = this.base64;
                    data.mime = this.mime;
                    data.filename = this.filename || '';
                } else if (this.downloadVariant === 'content') {
                    data.content = this.content;
                    data.mime = this.mime;
                    data.filename = this.filename || '';
                }
                // 'auto' → Server liefert Demo-CSV, kein Zusatz nötig
            } else if (this.successType === 'alert' || this.successType === 'forceReload') {
                data.msg = this.message;
            }
        }

        const payload = {uid, data};

        try {
            // Persistieren & Watcher registrieren
            this.client!.send(JSON.stringify(payload), {persist: true});
            this.pushLog('Sent', payload);
        } catch (e) {
            this.pushLog('Send failed', e);
            console.error('send failed', e);
        }
    };

    render() {
        console.log( 11 )
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