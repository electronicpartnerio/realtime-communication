export const appendQuery = (url: string, params: Record<string, string | number | boolean | undefined>) => {
    const u = new URL(url, window.location.href);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    });
    return u.toString();
}