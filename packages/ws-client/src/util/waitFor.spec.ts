/**
 * @vitest-environment happy-dom
 */
import { waitFor } from './waitFor';

describe('waitFor', () => {
    it('resolves when the condition becomes true', async () => {
        let ready = false;

        // Condition wird nach 50 ms true
        setTimeout(() => { ready = true; }, 50);

        const start = Date.now();
        await waitFor(() => ready, 200);
        const duration = Date.now() - start;

        expect(ready).toBe(true);
        // sollte grob >50 ms dauern, aber <200 ms Timeout
        expect(duration).toBeLessThan(200);
    });

    it('rejects with an error after timeout if condition stays false', async () => {
        const cond = () => false;

        await expect(waitFor(cond, 100)).rejects.toThrow('Timeout waiting for condition');
    });

    it('supports conditions returning undefined (treated as false)', async () => {
        let called = 0;
        const cond = () => { called++; return undefined; };

        await expect(waitFor(cond, 80)).rejects.toThrow('Timeout waiting for condition');
        expect(called).toBeGreaterThan(1); // wurde mehrfach gepollt
    });

    it('does not throw when condition is immediately true', async () => {
        const cond = () => true;
        await expect(waitFor(cond, 100)).resolves.toBeUndefined();
    });
});