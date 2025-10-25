export const guessFilename = (filename?: string, url?: string) => {
    if (filename) return filename;
    try {
        if (url) {
            const u = new URL(url, location.href);
            const last = u.pathname.split('/').filter(Boolean).pop();
            if (last) return last;
        }
    } catch {}
    return `download-${Date.now()}`;
};