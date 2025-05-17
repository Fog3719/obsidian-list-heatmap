const esbuild = require('esbuild');
const fs = require('fs');
const process = require('process');

const prod = process.argv[2] === 'production';

// 手动复制样式文件
if (!prod) {
    try {
        fs.copyFileSync('src/styles.css', 'styles.css');
    } catch (err) {
        console.log('Warning: Could not copy styles.css');
    }
}

// 确保dist目录存在
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

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
    outfile: 'dist/main.js',
}).catch(() => process.exit(1));

// 复制必要文件到dist目录
const filesToCopy = [
    'manifest.json',
    'styles.css'
];

filesToCopy.forEach(file => {
    try {
        fs.copyFileSync(file, `dist/${file}`);
    } catch (err) {
        console.log(`Warning: Could not copy ${file}`);
    }
});
