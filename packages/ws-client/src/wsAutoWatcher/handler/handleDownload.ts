import {guessFilename} from "../util/guessFilename";
import type {DownloadInput} from "../../interface";
import {triggerDownload} from "../util/triggerDownload";

export const handleDownload = async (input: DownloadInput): Promise<void> => {

    // Fall 1: URL
    if ('url' in input) {
        const filename = guessFilename(input.filename, input.url);
        if (input.forceFetch) {
            try {
                const res = await fetch(input.url, { credentials: 'include' });
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                triggerDownload(url, filename);
                return;
            } catch {
                // Fallback auf Direkt-Link
            }
        }
        // Direkt-Link mit download-Attribut (funktioniert, wenn Server das zulässt)
        triggerDownload(input.url, filename, false);
        return;
    }

    // Fall 2: Base64
    if ('base64' in input) {
        const mime = input.mime ?? 'application/octet-stream';
        const byteStr = atob(input.base64);
        const bytes = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) bytes[i] = byteStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: mime });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, guessFilename(input.filename));
        return;
    }

    // Fall 3: Rohinhalt (Text/Binary)
    if ('content' in input) {
        const mime = input.mime ?? 'application/octet-stream';
        // @ts-ignore
        const blob =
            input.content instanceof ArrayBuffer || input.content instanceof Uint8Array
                // @ts-ignore
                ? new Blob([input.content], { type: mime })
                : new Blob([String(input.content)], { type: mime });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, guessFilename(input.filename));
    }
};