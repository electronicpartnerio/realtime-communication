import { defineConfig } from 'vitest/config';
import {getVitestDefaultConfig} from "@electronicpartnerio/ui-utils/config/getVitestDefaultConfig";

export default defineConfig(getVitestDefaultConfig() as any);