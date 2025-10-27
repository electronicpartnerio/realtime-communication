/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerDownload } from './triggerDownload';

describe('triggerDownload', () => {
    let appendSpy: any;
    let removeSpy: any;
    let clickSpy: any;
    let revokeSpy: any;
    const realCreate = document.createElement.bind(document);

    beforeEach(() => {

        appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((a) => a);
        revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

        removeSpy = vi.fn();
        clickSpy = vi.fn();

        vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
            if (tag === 'a') {
                return {
                    href: '',
                    download: '',
                    rel: '',
                    click: clickSpy,
                    remove: removeSpy,
                } as any;
            }
            return realCreate(tag);
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    })

    it('erstellt <a>-Element und startet Download', () => {
        triggerDownload('blob:http://localhost/test123', 'demo.csv');
        expect(appendSpy).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(removeSpy).toHaveBeenCalled();
        expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/test123');
    });

    it('skippt URL.revokeObjectURL', () => {
        triggerDownload('blob:http://localhost/test123', 'demo.csv', false);
        expect(revokeSpy).not.toHaveBeenCalled();
    });

    it('setzt korrekte href-, download- und rel-Attribute', () => {
        let createdLink: any;
        (document.createElement as any).mockImplementationOnce(() => {
            createdLink = {
                href: '',
                download: '',
                rel: '',
                click: vi.fn(),
                remove: vi.fn(),
            };
            return createdLink;
        });

        triggerDownload('blob:test', 'file.txt');
        expect(createdLink.href).toBe('blob:test');
        expect(createdLink.download).toBe('file.txt');
        expect(createdLink.rel).toBe('noopener');
    });
});