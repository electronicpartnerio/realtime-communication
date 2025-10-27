import { isProdEnv } from './isProdEnv';

describe('isProdEnv', () => {
    const OLD_ENV = process.env;
    const OLD_IMPORT_META = import.meta.env;

    beforeEach(() => {
        // saubere Testumgebung simulieren
        process.env = { ...OLD_ENV };
        (import.meta as any).env = { ...OLD_IMPORT_META };
    });

    afterEach(() => {
        process.env = OLD_ENV;
        (import.meta as any).env = OLD_IMPORT_META;
    });

    it('returns true when explicit env argument is "production"', () => {
        expect(isProdEnv('production')).toBe(true);
    });

    it('returns false when explicit env argument is not "production"', () => {
        expect(isProdEnv('development')).toBe(false);
        expect(isProdEnv('test')).toBe(false);
        expect(isProdEnv('')).toBe(false);
    });

    it('checks process.env.NODE_ENV === "production"', () => {
        (import.meta as any).env = {};
        process.env.NODE_ENV = 'production';
        expect(isProdEnv()).toBe(true);
    });

    it('returns false when neither import.meta.env.MODE nor NODE_ENV is "production"', () => {
        (import.meta as any).env = { MODE: 'development' };
        process.env.NODE_ENV = 'test';
        expect(isProdEnv()).toBe(false);
    });
});