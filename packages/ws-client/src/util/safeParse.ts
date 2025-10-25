export const safeParse = <T = any>(data: unknown): T | null => {
    if (typeof data !== 'string') return null;
    try {
        return JSON.parse(data) as T;
    } catch {
        return null;
    }
};