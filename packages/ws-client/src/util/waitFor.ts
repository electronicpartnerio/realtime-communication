export const waitFor = async (cond: () => boolean | undefined, timeoutMs = 5000): Promise<void> => {
    const start = Date.now();
    while (!cond()) {
        await new Promise(r => setTimeout(r, 25));
        if (Date.now() - start > timeoutMs) throw new Error("Timeout waiting for condition");
    }
}