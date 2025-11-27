#!/usr/bin/env node

const {spawnSync} = require('child_process');
const path = require('path');

// Change to dist directory and run electron-forge make
const distDir = path.join(__dirname, '..', 'dist');

// Pass all arguments after script name to electron-forge
const args = ['make', ...process.argv.slice(2)];

console.info('Running electron-forge with args:', args);
console.info('Working directory:', distDir);

const result = spawnSync('electron-forge', args, {
    cwd: distDir,
    stdio: 'inherit',
    shell: true,
});

process.exit(result.status || 0);