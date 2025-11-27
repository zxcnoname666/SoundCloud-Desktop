#!/usr/bin/env node

const {spawnSync} = require('child_process');
const path = require('path');

// Change to dist directory and run electron-forge make
const distDir = path.join(__dirname, '..', 'dist');

const result = spawnSync('electron-forge', ['make'], {
    cwd: distDir,
    stdio: 'inherit',
    shell: true,
});

process.exit(result.status || 0);