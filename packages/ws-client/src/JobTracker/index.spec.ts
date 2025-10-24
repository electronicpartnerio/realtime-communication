/**
 * @vitest-environment happy-dom
 */
import { JobTracker } from './index';
import type { JobRecord } from '../interface';

describe('JobTracker', () => {
    const key = 'test.jobs';
    let tracker: JobTracker;

    const sampleJob = (id: string, status: JobRecord['status'] = 'pending'): JobRecord => ({
        jobId: id,
        status,
        correlationId: id + '_c',
        type: 'print',
        startedAt: Date.now(),
        updatedAt: Date.now(),
    });

    beforeEach(() => {
        localStorage.clear();
        tracker = new JobTracker(key);
    });

    it('returns empty list when no data stored', () => {
        expect(tracker.list()).toEqual([]);
    });

    it('saves and loads list', () => {
        const jobs = [sampleJob('a'), sampleJob('b', 'done')];
        tracker.saveAll(jobs);
        expect(tracker.list()).toEqual(jobs);
    });

    it('handles corrupted JSON gracefully', () => {
        localStorage.setItem(key, 'not-json');
        expect(tracker.list()).toEqual([]);
    });

    it('upserts new jobs and updates existing ones', () => {
        const j1 = sampleJob('x');
        tracker.upsert(j1);
        expect(tracker.list()).toHaveLength(1);

        const updated = { ...j1, status: 'done' as const };
        tracker.upsert(updated);
        const stored = tracker.get('x');
        expect(stored?.status).toBe('done');
        expect(tracker.list()).toHaveLength(1);
    });

    it('get() returns a job by id', () => {
        const j = sampleJob('findme');
        tracker.saveAll([j]);
        expect(tracker.get('findme')).toEqual(j);
        expect(tracker.get('missing')).toBeUndefined();
    });

    it('remove() deletes a job by id', () => {
        const a = sampleJob('a');
        const b = sampleJob('b');
        tracker.saveAll([a, b]);

        tracker.remove('a');
        const list = tracker.list();
        expect(list).toHaveLength(1);
        expect(list[0].jobId).toBe('b');
    });

    it('pending() filters only jobs with status "pending"', () => {
        tracker.saveAll([
            sampleJob('p1', 'pending'),
            sampleJob('p2', 'done'),
            sampleJob('p3', 'error'),
            sampleJob('p4', 'pending'),
        ]);
        const pendings = tracker.pending();
        expect(pendings.map(j => j.jobId)).toEqual(['p1', 'p4']);
    });

    it('uses custom storage key', () => {
        const other = new JobTracker('custom.key');
        other.saveAll([sampleJob('x')]);
        expect(localStorage.getItem('custom.key')).toContain('x');
    });
});