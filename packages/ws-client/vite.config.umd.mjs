import { defineConfig } from 'vitest/config';
import banner from 'vite-plugin-banner';
import pkg from './package.json';
import { resolve } from 'path';

export default defineConfig((_) => {
    const name = 'EpWsService';
    return {
        mode: 'umd',
        base: '',
        esbuild: {
            supported: {
                'top-level-await': true
            }
        },
        optimizeDeps: {
            exclude: ['@electronicpartnerio/uic', '@electronicpartnerio/ep-lit-translate']
        },
        build: {
            outDir: 'umd',
            minify: true,
            sourcemap: true,
            emptyOutDir: true,
            rollupOptions: {
                external: ['@electronicpartnerio/uic', '@electronicpartnerio/ep-lit-translate'],
                output: {
                    globals: {
                        '@electronicpartnerio/uic': 'EpUic',
                        '@electronicpartnerio/ep-lit-translate': 'EpLitTranslate'
                    }
                }
            },
            lib: {
                entry: resolve(__dirname, 'src/index.ts'),
                formats: ['umd'],
                fileName: `index`,
                name
            }
        },
        plugins: [banner(`/**\n *  ${pkg.name}: v${pkg.version}\n *  ${new Date()}\n */`)]
    };
});