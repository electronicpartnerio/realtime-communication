import type {RegistryEntry, WatchedMessage} from "./interface";

export const registry = new Map<string, RegistryEntry>();

export const watcherCache = new Map<string, WatchedMessage>();