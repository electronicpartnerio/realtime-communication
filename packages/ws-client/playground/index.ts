import { customElement, state, query } from 'lit/decorators.js';
import { css, html, LitElement } from 'lit';
import WebSocketService from "../src";

@customElement('ep-playground')
export class Playground extends LitElement {
    @state() loading: boolean = false;

    static styles = css`:host {
        display: block
    }`;

    private async handleClick() {
        this.loading = true;
        try {
            await startPrintJob({
                template: 'standard_a3_a6',
                fields: {artikelnummer: '132456798',},
            });
            // Erfolg wird via Toast + Auto-Download gemeldet
        } catch (e) {
            // Fehler-Toast kommt bereits aus dem Service, hier optional zusätzlich handeln
            console.error(e);
        } finally {
            this.loading = false;
        }
    }

    render() {
        return html`
            <button ?disabled=${this.loading} @click=${this.handleClick}>
                ${this.loading ? 'Wird gedruckt…' : 'Drucken'}
            </button>
        `;
    }
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