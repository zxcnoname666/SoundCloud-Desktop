const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

execSync('cargo build --release', {
    cwd: path.join(__dirname, 'sc-rename'),
    stdio: 'inherit',
});

const BinsDirPath = path.join(__dirname, '..', 'bins');
const screnameBinPath = path.join(BinsDirPath, 'sc-rename.exe');
const screnamePath = path.join(__dirname, 'sc-rename', 'target', 'release', 'sc-rename.exe');

if (fs.existsSync(screnamePath)) {
    if (!fs.existsSync(BinsDirPath)) {
        fs.mkdirSync(BinsDirPath, { recursive: true });
    }
    else if (fs.existsSync(screnameBinPath)) {
        fs.rmSync(screnameBinPath, { force: true });
    }

    fs.copyFileSync(screnamePath, screnameBinPath);
}

execSync('electron-builder', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
});