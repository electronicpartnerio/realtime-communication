export const normalizeUrl = (
    url: string,
    authToken?: string,
    appendAuth: boolean = true
): string => {
    const u = new URL(url);

    if (authToken && appendAuth && !u.searchParams.has('token')) {
        u.searchParams.set('token', authToken);
    }

    // Nur den pathname bereinigen, nicht das gesamte URL-Objekt
    u.pathname = u.pathname.replace(/\/{2,}/g, '/');

    return u.toString();
};