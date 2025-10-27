export const triggerDownload = (href: string, filename: string, revoke: boolean = true) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();

    revoke && URL.revokeObjectURL(href);
};