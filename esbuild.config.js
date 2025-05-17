const esbuild = require('esbuild');
const copy = require('esbuild-plugin-copy').default;
const process = require('process');

const prod = process.argv[2] === 'production';

esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    external: ['obsidian'],
    format: 'cjs',
    watch: !prod,
    target: 'es2016',
    logLevel: 'info',
    sourcemap: prod ? false : 'inline',
    treeShaking: true,
    outfile: 'main.js',
    plugins: [
        copy({
            assets: [
                { from: ['src/styles.css'], to: ['styles.css'] },
            ],
        }),
    ],
}).catch(() => process.exit(1));
