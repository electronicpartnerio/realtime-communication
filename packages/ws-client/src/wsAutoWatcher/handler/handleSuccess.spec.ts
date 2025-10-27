/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleSuccess } from './handleSuccess';
import { showToast } from '../util/showToast';
import { hideToast } from '../util/hideToast';
import { removeMessage } from '../util/removeMessage';
import { handleDownload } from './handleDownload';
import { handleAlert } from './handleAlert';
import { handleForceReload } from './handleForceReload';

vi.mock('../util/showToast', () => ({ showToast: vi.fn(() => Promise.resolve()) }));
vi.mock('../util/hideToast', () => ({ hideToast: vi.fn() }));
vi.mock('../util/removeMessage', () => ({ removeMessage: vi.fn() }));
vi.mock('./handleDownload', () => ({ handleDownload: vi.fn(() => Promise.resolve()) }));
vi.mock('./handleAlert', () => ({ handleAlert: vi.fn(() => Promise.resolve()) }));
vi.mock('./handleForceReload', () => ({ handleForceReload: vi.fn(() => Promise.resolve()) }));

describe('handleSuccess', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('ruft hideToast und showToast mit success auf', async () => {
        const input = { id: '1', toast: 'download.ready', data: {} };

        await handleSuccess(input as any);

        expect(hideToast).toHaveBeenCalledWith('1');
        expect(showToast).toHaveBeenCalledWith('success', '1', 'download.ready');
    });

    it('ruft handleDownload und removeMessage bei type=download auf', async () => {
        const input = { id: '2', toast: 'done', data: { type: 'download', url: 'x' } };

        await handleSuccess(input as any);

        expect(handleDownload).toHaveBeenCalledWith(input.data);
        expect(removeMessage).toHaveBeenCalledWith('2');
    });

    it('ruft handleAlert mit data.msg auf, wenn type=alert', async () => {
        const input = { id: '3', toast: 'fallback.toast', data: { type: 'alert', msg: 'alert.hello' } };

        await handleSuccess(input as any);

        expect(handleAlert).toHaveBeenCalledWith('alert.hello');
        expect(removeMessage).toHaveBeenCalledWith('3');
    });

    it('nutzt toast als Fallback, wenn alert keine msg hat', async () => {
        const input = { id: '4', toast: 'toast.msg', data: { type: 'alert' } };

        await handleSuccess(input as any);

        expect(handleAlert).toHaveBeenCalledWith('toast.msg');
    });

    it('ruft handleForceReload bei type=forceReload auf', async () => {
        const input = { id: '5', toast: 'toast.force', data: { type: 'forceReload', msg: 'reload.now' } };

        await handleSuccess(input as any);

        expect(handleForceReload).toHaveBeenCalledWith('reload.now');
        expect(removeMessage).toHaveBeenCalledWith('5');
    });

    it('macht nichts weiter, wenn kein type vorhanden ist', async () => {
        const input = { id: '6', toast: 'no.type', data: {} };

        await handleSuccess(input as any);

        expect(handleDownload).not.toHaveBeenCalled();
        expect(handleAlert).not.toHaveBeenCalled();
        expect(handleForceReload).not.toHaveBeenCalled();
        expect(removeMessage).not.toHaveBeenCalled();
    });
});