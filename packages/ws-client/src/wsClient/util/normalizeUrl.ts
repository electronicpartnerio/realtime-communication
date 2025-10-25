export const normalizeUrl = (url: string, authToken?: string, appendAuth: boolean = true): string => {
    const u = new URL(url);
    if (authToken && appendAuth && !u.searchParams.has('token')) {
        u.searchParams.set('token', authToken);
    }
    return u.toString().replace(/(?<!:)\/\/+/g, '//');
};