/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initClient } from './initClient';
import { safeParse } from '../../util/safeParse';
import { updateMessageState } from './updateMessageState';
import { handlePending } from '../handler/handlePending';
import { handleError } from '../handler/handleError';
import { handleSuccess } from '../handler/handleSuccess';

vi.mock('../../util/safeParse', () => ({ safeParse: vi.fn() }));
vi.mock('./updateMessageState', () => ({ updateMessageState: vi.fn() }));
vi.mock('../handler/handlePending', () => ({ handlePending: vi.fn(() => Promise.resolve()) }));
vi.mock('../handler/handleError', () => ({ handleError: vi.fn(() => Promise.resolve()) }));
vi.mock('../handler/handleSuccess', () => ({ handleSuccess: vi.fn(() => Promise.resolve()) }));

describe('initClient', () => {
    const mockOn = vi.fn();
    const mockClient = { on: mockOn } as any;

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('registriert Listener auf message-Event', () => {
        initClient(mockClient);
        expect(mockOn).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('ignoriert Events ohne gültige msg.id oder state', async () => {
        const handler = vi.fn();
        mockOn.mockImplementationOnce((_event, cb) => handler.mockImplementation(cb));

        (safeParse as vi.Mock).mockReturnValueOnce({}); // kein id/state
        initClient(mockClient);

        const e = new MessageEvent('message', { data: '{}' });
        await handler(e);

        expect(updateMessageState).not.toHaveBeenCalled();
        expect(handlePending).not.toHaveBeenCalled();
    });

    it('ruft updateMessageState und passenden Handler auf', async () => {
        const e = new MessageEvent('message', { data: '{"id":"1","state":"pending"}' });
        const parsed = { id: '1', state: 'pending' };
        (safeParse as vi.Mock).mockReturnValueOnce(parsed);

        let cb!: (e: MessageEvent) => void;
        mockOn.mockImplementationOnce((_event, fn) => { cb = fn; });

        initClient(mockClient);
        await cb(e);

        expect(updateMessageState).toHaveBeenCalledWith('1', 'pending');
        expect(handlePending).toHaveBeenCalledWith(parsed);
        expect(handleError).not.toHaveBeenCalled();
        expect(handleSuccess).not.toHaveBeenCalled();
    });

    it('ruft handleError bei state=error auf', async () => {
        const parsed = { id: '2', state: 'error' };
        (safeParse as vi.Mock).mockReturnValueOnce(parsed);
        let cb!: (e: MessageEvent) => void;
        mockOn.mockImplementationOnce((_event, fn) => { cb = fn; });

        initClient(mockClient);
        await cb(new MessageEvent('message', { data: '{}' }));

        expect(handleError).toHaveBeenCalledWith(parsed);
    });

    it('ruft handleSuccess bei state=success auf', async () => {
        const parsed = { id: '3', state: 'success' };
        (safeParse as vi.Mock).mockReturnValueOnce(parsed);
        let cb!: (e: MessageEvent) => void;
        mockOn.mockImplementationOnce((_event, fn) => { cb = fn; });

        initClient(mockClient);
        await cb(new MessageEvent('message', { data: '{}' }));

        expect(handleSuccess).toHaveBeenCalledWith(parsed);
    });
});