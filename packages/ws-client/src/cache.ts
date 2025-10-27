import type {RegistryEntry, WatchedMessage} from "./interface";
import {toastFactory} from "@electronicpartnerio/uic";

export const registry = new Map<string, RegistryEntry>();

export const watcherCache = new Map<string, WatchedMessage>();


export const toast = toastFactory();