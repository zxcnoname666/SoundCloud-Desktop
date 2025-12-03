#!/usr/bin/env node

const {spawnSync} = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const os = require("node:os");

// Change to dist directory and run electron-forge package
const distDir = path.join(__dirname, '..', 'dist');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-'));
const outputDir = path.join(__dirname, '..', 'out');

const forgeBin = path.join(__dirname, '..', 'node_modules', '.bin', 'electron-forge').replaceAll(' ', '\\ ');

// Pass all arguments after script name to electron-forge
const args = ['make', ...process.argv.slice(2)];

console.info('Running electron-forge with args:', args);
console.info('Working directory:', distDir);
console.info('Forge binary:', forgeBin);

fs.cpSync(distDir, tempDir, {recursive: true, force: true});

spawnSync('pnpm', ['i', 'electron'], {
    cwd: tempDir,
    stdio: 'inherit',
    shell: true,
});

const result = spawnSync(forgeBin, args, {
    cwd: tempDir,
    stdio: 'inherit',
    shell: true,
});

fs.rmSync(outputDir, {recursive: true, force: true});
fs.cpSync(path.join(tempDir, 'out'), outputDir, {recursive: true, force: true});

process.exit(result.status || 0);