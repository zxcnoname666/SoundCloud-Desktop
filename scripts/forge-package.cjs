#!/usr/bin/env node

const {spawnSync} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require("node:os");

// Change to dist directory and run electron-forge package
const distDir = path.join(__dirname, '..', 'dist');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-'));
const outputDir = path.join(__dirname, '..', 'out');

fs.cpSync(distDir, tempDir, {recursive: true, force: true});

spawnSync('pnpm', ['i', 'electron'], {
    cwd: tempDir,
    stdio: 'inherit',
    shell: true,
});

const result = spawnSync('electron-forge', ['package'], {
    cwd: tempDir,
    stdio: 'inherit',
    shell: true,
});

fs.rmSync(outputDir, {recursive: true, force: true});
fs.cpSync(path.join(tempDir, 'out'), outputDir, {recursive: true, force: true});

process.exit(result.status || 0);