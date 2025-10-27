// server.js
// Node >=18 empfohlen. Start: `npm i ws` && `node server.js`
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PORT = process.env.PORT || 8080;
const PATH = process.env.WS_PATH || '/realtime';

// --- kleiner Helfer für Logs ------------------------------------------------
const log = (...a) => console.log('[WS]', ...a);
const warn = (...a) => console.warn('[WS]', ...a);
const error = (...a) => console.error('[WS]', ...a);

// --- HTTP-Server + WSS ------------------------------------------------------
const server = http.createServer((req, res) => {
    // Minimal-Info-Endpunkt
    if (req.url === '/' || req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ws: `ws://localhost:${PORT}${PATH}` }));
        return;
    }
    res.writeHead(404);
    res.end();
});

const wss = new WebSocketServer({ server, path: PATH });

wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    log('Client connected', { url: url.pathname, token: token ? '[present]' : '(none)' });

    // einfache Ping/Pong-Keepalive
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));

    ws.on('message', async (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        } catch (e) {
            warn('Non-JSON message received, ignoring');
            return;
        }

        const { id, data } = msg || {};
        if (!id) {
            warn('Missing id; ignoring message');
            return;
        }

        // Simulation-Optionen aus dem Payload
        const sim = {
            pending: data?.sim?.pending ?? false,
            outcome: data?.sim?.outcome ?? 'success', // 'success' | 'error'
            delayMs: data?.sim?.delayMs ?? 100,
        };

        // Optional: Toasts aus Payload
        const toastPending = data?.toastPending ?? 'download.starting';
        const toastSuccess = data?.toastSuccess ?? 'download.ready';
        const toastError = data?.toastError ?? 'download.error';

        // 1) optional PENDING
        if (sim.pending) {
            const pending = {
                id,
                state: 'pending',
                toast: toastPending,
                data: {}, // leer lassen; Client interessiert State + Toast
            };
            ws.send(JSON.stringify(pending));
        }

        // 2) DELAY -> finale Antwort
        setTimeout(async () => {
            try {
                if (sim.outcome === 'success') {
                    // success-Varianten über data.type steuern
                    const type = data?.type; // 'download' | 'alert' | 'forceReload'
                    const successPayload = buildSuccessPayload(data);

                    const success = {
                        id,
                        state: 'success',
                        toast: toastSuccess,
                        data: { type, ...successPayload },
                    };
                    ws.send(JSON.stringify(success));
                } else {
                    // Fehlerpfad
                    const err = {
                        id,
                        state: 'error',
                        toast: toastError,
                        data: {
                            code: data?.errorCode ?? 500,
                            msg: data?.errorMsg ?? 'server.error',
                        },
                    };
                    ws.send(JSON.stringify(err));
                }
            } catch (e) {
                error('failed to send final response', e);
            }
        }, Number(sim.delayMs));
    });

    ws.on('close', () => log('Client disconnected'));
    ws.on('error', (e) => error('Client socket error', e));
});

// Keepalive-Interval (optional)
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(interval));

server.listen(PORT, () => {
    log(`HTTP up on http://localhost:${PORT}`);
    log(`WS up on   ws://localhost:${PORT}${PATH}`);
});

// --- Helpers ----------------------------------------------------------------

/**
 * Baut den success-spezifischen Payload anhand von data.type:
 *  - type: 'download'
 *      * url           → Direkt-Download-Link (optional: filename, forceFetch)
 *      * base64,mime   → Base64-Blob
 *      * content,mime  → Text/Binary-Inhalt
 *  - type: 'alert'
 *      * msg           → Alert-Text/Key
 *  - type: 'forceReload'
 *      * msg           → Confirm-Text/Key
 */
function buildSuccessPayload(data) {
    const type = data?.type;

    if (type === 'download') {
        // Falls der Client nichts liefert, bieten wir 3 Varianten an
        if (data?.url) {
            return {
                type,
                url: 'https://www.dev.ep-infonet.com/assets/img/y_Qx54tf38-400.avif',
                filename: 'demo.avif',
                forceFetch: Boolean(data.forceFetch),
            };
        }
        if (data?.base64) {
            return {
                type,
                base64: 'iVBORw0KGgoAAAANSUhEUgAAAHMAAABUCAYAAACx6ghoAAABWGlDQ1BJQ0MgUHJvZmlsZQAAKJF1kE9LQkEUxY/1zBIJqaBFBu4KMYlnLiIIzIUUFWIKVpveG00FfU3ji/5s+gDVRwhatG/TqlXLVkEEUR+hZQQSlEx3fJVadOFyfpw5M9y5QJdmcF7RAFQtW6STc8Hc6lrQ8wwvRtALN3SD1Xg8lVqkCL61s+oPcCm9n1BvLR2EFk6Oljduh3M9ATMz+DffUd58ocZIP6hDjAsbcI0Tp3ZtrniPeEjQUMTHiosOnyk2Hb5sZjLpBPENsZ+VjDzxI3HYbPOLbVyt7LCvGdT0voKVXSHtpw4giyh0pBHDNGiCf7JTzWwCW+DYh0AZRZRgI4g4ORwVFIjnYYEhgjCxjknqmNrx7921PDsJzLyow5a3fghc3AEDkZY35qdvzwLXfdwQxs9GXXWtthnVHfYJwP0m5eso4LkCGkLK91MpG+dA9xPd3f4EpnlexikRLbkAAABWZVhJZk1NACoAAAAIAAGHaQAEAAAAAQAAABoAAAAAAAOShgAHAAAAEgAAAESgAgAEAAAAAQAAAHOgAwAEAAAAAQAAAFQAAAAAQVNDSUkAAABTY3JlZW5zaG90wiBJoAAAAdVpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IlhNUCBDb3JlIDYuMC4wIj4KICAgPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICAgICAgPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIKICAgICAgICAgICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iPgogICAgICAgICA8ZXhpZjpQaXhlbFlEaW1lbnNpb24+ODQ8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpQaXhlbFhEaW1lbnNpb24+MTE1PC9leGlmOlBpeGVsWERpbWVuc2lvbj4KICAgICAgICAgPGV4aWY6VXNlckNvbW1lbnQ+U2NyZWVuc2hvdDwvZXhpZjpVc2VyQ29tbWVudD4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CuDXwDUAAAE5SURBVHgB7dPBDQAhDMTA4/pvFsQfJMoYOR3Yzo659vk6wsBPUATxDBQTeoRiFhMyAKG0zGJCBiCUlllMyACE0jKLCRmAUFpmMSEDEErLLCZkAEJpmcWEDEAoLbOYkAEIpWUWEzIAobTMYkIGIJSWWUzIAITSMosJGYBQWmYxIQMQSsssJmQAQmmZxYQMQCgts5iQAQilZRYTMgChtMxiQgYglJZZTMgAhNIyiwkZgFBaZjEhAxBKyywmZABCaZnFhAxAKC2zmJABCKVlFhMyAKG0zGJCBiCUlllMyACE0jKLCRmAUFpmMSEDEErLLCZkAEJpmcWEDEAoLbOYkAEIpWUWEzIAobTMYkIGIJSWWUzIAITSMosJGYBQWmYxIQMQSsssJmQAQmmZxYQMQCgts5iQAQilZUIxL5OpBH6fSEldAAAAAElFTkSuQmCC',
                mime: 'image/png',
                filename:  `demo.png`,
            };
        }
        if (data?.content) {
            return {
                type,
                content: 'lorem ipsum',
                mime:  'text/plain',
                filename: `demo.txt`,
            };
        }

        // Default: liefere Demo-CSV als "content"
        return {
            type,
            content: 'id,name\n1,Alice\n2,Bob\n',
            mime: 'text/csv',
            filename: 'demo.csv',
        };
    }

    if (type === 'alert') {
        return {
            type,
            msg: data?.msg || 'alert.hello',
        };
    }

    if (type === 'forceReload') {
        return {
            type,
            msg: data?.msg || 'reload.confirm',
        };
    }

    // Kein spezieller Typ → leeres data
    return {};
}
const sendJson = (ws, obj) => {
    try {
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(obj));
    } catch (e) {
        error('sendJson failed', e);
    }
};