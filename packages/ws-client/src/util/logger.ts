import type {LoggerConfig, LogLevel} from "../interface";
import {isProdEnv} from "./isProdEnv";

export const createLogger = (config: LoggerConfig = {}) => {
    const prod = isProdEnv(config.env);
    const silent = config.silent ?? prod; // auf Prod per default silent

    const print = (level: LogLevel, ...args: any[]) => {
        // Fehler dürfen *immer* raus, alles andere nur wenn nicht silent
        if (level !== 'error' && silent) return;
        const prefix = `[WS:${level.toUpperCase()}]`;
        // eslint-disable-next-line no-console
        console[level](prefix, ...args);
    };

    return {
        log: (...args: any[]) => print('log', ...args),
        warn: (...args: any[]) => print('warn', ...args),
        info: (...args: any[]) => print('info', ...args),
        error: (...args: any[]) => print('error', ...args),
    };
};

// Default-Logger sofort exportieren (automatisch nach ENV)
export const logger = createLogger();
