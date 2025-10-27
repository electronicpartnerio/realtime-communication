export const guessFilename = (filename?: string, url?: string): string => {
    if (filename) return filename;

    if (url) {
        try {
            const last = url.split('/').filter(Boolean).pop();
            if (last) {
                const decoded = decodeURIComponent(last);

                const clean = decoded.split(/[?#]/)[0];

                if (clean.trim()) return clean.trim();
            }
        } catch {
            // ignorieren → fallback
        }
    }

    return `download-${Date.now()}`;
};