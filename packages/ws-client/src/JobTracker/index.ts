import type {JobRecord} from "../interface";

export class JobTracker {
    private key: string;

    constructor(storageKey = "ws.jobs") {
        this.key = storageKey;
    }

    list = (): JobRecord[] => {
        try {
            return JSON.parse(localStorage.getItem(this.key) || "[]");
        } catch {
            return [];
        }
    }
    saveAll = (list: JobRecord[]) => {
        localStorage.setItem(this.key, JSON.stringify(list));
    }
    upsert = (job: JobRecord) => {
        const list = this.list();
        const idx = list.findIndex(j => j.jobId === job.jobId);
        if (idx >= 0) list[idx] = job; else list.push(job);
        this.saveAll(list);
    }
    get = (jobId: string) => {
        return this.list().find(j => j.jobId === jobId);
    }
    remove = (jobId: string) => {
        this.saveAll(this.list().filter(j => j.jobId !== jobId));
    }
    pending = (): JobRecord[] => {
        return this.list().filter(j => j.status === "pending");
    }
}