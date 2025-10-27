import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from './logger';
import * as envUtil from './isProdEnv';

// Wir mocken die Konsolenfunktionen
const mockConsole = {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    info: vi.spyOn(console, 'info').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('createLogger', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('prints all levels when not silent', () => {
        vi.spyOn(envUtil, 'isProdEnv').mockReturnValue(false);
        const logger = createLogger({ silent: false });

        logger.log('log message');
        logger.info('info message');
        logger.warn('warn message');
        logger.error('error message');

        expect(mockConsole.log).toHaveBeenCalledWith('[WS:LOG]', 'log message');
        expect(mockConsole.info).toHaveBeenCalledWith('[WS:INFO]', 'info message');
        expect(mockConsole.warn).toHaveBeenCalledWith('[WS:WARN]', 'warn message');
        expect(mockConsole.error).toHaveBeenCalledWith('[WS:ERROR]', 'error message');
    });

    it('suppresses non-error logs when silent=true', () => {
        vi.spyOn(envUtil, 'isProdEnv').mockReturnValue(false);
        const logger = createLogger({ silent: true });

        logger.log('hidden');
        logger.info('hidden');
        logger.warn('hidden');
        logger.error('always visible');

        expect(mockConsole.log).not.toHaveBeenCalled();
        expect(mockConsole.info).not.toHaveBeenCalled();
        expect(mockConsole.warn).not.toHaveBeenCalled();
        expect(mockConsole.error).toHaveBeenCalledWith('[WS:ERROR]', 'always visible');
    });

    it('defaults to silent in production (via isProdEnv)', () => {
        vi.spyOn(envUtil, 'isProdEnv').mockReturnValue(true);
        const logger = createLogger();

        logger.log('hidden');
        logger.error('still visible');

        expect(mockConsole.log).not.toHaveBeenCalled();
        expect(mockConsole.error).toHaveBeenCalledWith('[WS:ERROR]', 'still visible');
    });

    it('is not silent by default in non-production', () => {
        vi.spyOn(envUtil, 'isProdEnv').mockReturnValue(false);
        const logger = createLogger();

        logger.info('should appear');
        expect(mockConsole.info).toHaveBeenCalledWith('[WS:INFO]', 'should appear');
    });

    it('passes extra arguments to console', () => {
        vi.spyOn(envUtil, 'isProdEnv').mockReturnValue(false);
        const logger = createLogger();

        logger.warn('msg', { foo: 1 }, [1, 2, 3]);
        expect(mockConsole.warn).toHaveBeenCalledWith('[WS:WARN]', 'msg', { foo: 1 }, [1, 2, 3]);
    });
});