import { defineConfig } from 'vitest/config';
import banner from 'vite-plugin-banner';
import pkg from './package.json';
import { resolve } from 'path';

export default defineConfig((_) => {
    const name = 'EpTranslate';
    return {
        mode: 'umd',
        base: '',
        esbuild: {
            supported: {
                'top-level-await': true
            }
        },
        build: {
            outDir: 'umd',
            minify: true,
            sourcemap: true,
            emptyOutDir: true,
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