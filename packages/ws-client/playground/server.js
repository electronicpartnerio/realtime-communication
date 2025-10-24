import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { nanoid } from "nanoid";

/**
 * Minimal-Server:
 * - GET /  -> static files aus ./public
 * - WS auf path /ws  (mit optionalem ?token=... )
 *
 * WS-Protokoll (Simulation):
 *  - Client sendet: { type: "<jobType>.start", payload: {...}, correlationId }
 *  - Server antwortet sofort: { type: "ack", jobId, correlationId, jobType }
 *  - optional: { type: "job.update", jobId, progress }
 *  - final: { type: "job.done", jobId, correlationId, downloadUrl, count }
 *           oder { type: "job.error", jobId, correlationId, error }
 *  - subscribe: { type: "job.subscribe", jobId }
 *  - heartbeat: { type: "ping", ts } -> optional { type:"pong", ts }
 */

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);

// In-Memory Jobstore
// jobId -> { status: "pending"|"done"|"error", jobType, correlationId, count, timers[], subscribers:Set<ws>, downloadUrl, error}
const jobs = new Map();

const wss = new WebSocketServer({ noServer: true });

// HTTP->WS Upgrade nur für /ws
server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== "/ws") {
        socket.destroy();
        return;
    }
    // simple token check (optional)
    const token = url.searchParams.get("token");
    // In echt: if (!tokenOK) socket.destroy();
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, token);
    });
});

wss.on("connection", (ws, req, token) => {
    // Optionale Log-Ausgabe
    console.log("WS connected", { token });

    ws.on("message", (buf) => {
        let msg;
        try {
            msg = JSON.parse(buf.toString());
        } catch {
            // unknow format
            return;
        }

        // Heartbeat
        if (msg?.type === "ping") {
            // optional ack
            // ws.send(JSON.stringify({ type: "pong", ts: msg.ts }));
            return;
        }

        // Subscribe für nachträgliches Attach
        if (msg?.type === "job.subscribe" && msg.jobId) {
            const rec = jobs.get(msg.jobId);
            if (!rec) return;
            rec.subscribers.add(ws);
            // sofortigen Status pushen
            if (rec.status === "pending") {
                ws.send(JSON.stringify({
                    type: rec.jobType ? `${rec.jobType}.job.update` : "job.update",
                    jobId: rec.jobId,
                    correlationId: rec.correlationId,
                    progress: rec.progress ?? 0
                }));
            }
            if (rec.status === "done") {
                ws.send(JSON.stringify({
                    type: rec.jobType ? `${rec.jobType}.job.done` : "job.done",
                    jobId: rec.jobId,
                    correlationId: rec.correlationId,
                    downloadUrl: rec.downloadUrl,
                    count: rec.count ?? 1
                }));
            }
            if (rec.status === "error") {
                ws.send(JSON.stringify({
                    type: rec.jobType ? `${rec.jobType}.job.error` : "job.error",
                    jobId: rec.jobId,
                    correlationId: rec.correlationId,
                    error: rec.error || "Unknown error"
                }));
            }
            return;
        }

        // Start eines Jobs: <jobType>.start
        if (typeof msg?.type === "string" && msg.type.endsWith(".start")) {
            const jobType = msg.type.slice(0, msg.type.indexOf(".start")); // "printTag"
            const jobId = "job_" + nanoid(8);

            // ACK sofort
            ws.send(JSON.stringify({
                type: "ack",                 // kompatibel zu deinem WebSocketService
                jobType,
                jobId,
                correlationId: msg.correlationId
            }));

            // Job anlegen
            const rec = {
                jobId,
                status: "pending",
                jobType,
                correlationId: msg.correlationId,
                subscribers: new Set([ws]),
                progress: 0,
                count: Math.floor(Math.random() * 5) + 1, // Demo-Zahl
                downloadUrl: `http://localhost:3000/fake-download/${jobId}.pdf`
            };
            jobs.set(jobId, rec);

            // Simulierter Verlauf: update -> done/ error
            const t1 = setTimeout(() => {
                rec.progress = 50;
                broadcast(rec, {
                    type: jobType ? `${jobType}.job.update` : "job.update",
                    jobId,
                    correlationId: rec.correlationId,
                    progress: 50
                });
            }, 700);

            const willFail = !!msg?.payload?.fail; // via payload steuerbar
            const t2 = setTimeout(() => {
                if (willFail) {
                    rec.status = "error";
                    rec.error = "Simulated failure";
                    broadcast(rec, {
                        type: jobType ? `${jobType}.job.error` : "job.error",
                        jobId,
                        correlationId: rec.correlationId,
                        error: rec.error
                    });
                } else {
                    rec.status = "done";
                    broadcast(rec, {
                        type: jobType ? `${jobType}.job.done` : "job.done",
                        jobId,
                        correlationId: rec.correlationId,
                        downloadUrl: rec.downloadUrl,
                        count: rec.count
                    });
                }
            }, 1500);

            rec.timers = [t1, t2];
            return;
        }

        // Echo / einfache Replies: {type:"echo", correlationId} -> {type:"echo.result", correlationId}
        if (msg?.type === "echo") {
            ws.send(JSON.stringify({
                type: "echo.result",
                correlationId: msg.correlationId,
                payload: msg.payload ?? null
            }));
            return;
        }
    });

    ws.on("close", () => {
        // optional: Subscriber entfernen
        for (const rec of jobs.values()) {
            rec.subscribers.delete(ws);
        }
    });
});

function broadcast(rec, payload) {
    // an alle Subscriber für diesen Job
    for (const s of rec.subscribers) {
        if (s.readyState === 1) s.send(JSON.stringify(payload));
    }
}

const PORT = process.env.PORT || 3013;
server.listen(PORT, () => {
    console.log(`HTTP+WS listening on http://localhost:${PORT}`);
    console.log(`WS endpoint: ws://localhost:${PORT}/ws?token=dev`);
});