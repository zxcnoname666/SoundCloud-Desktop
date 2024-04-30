const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');

execSync('cargo build --release', {
    cwd: path.join(__dirname, 'sc-rename'),
    stdio: 'inherit',
});

const BuildDir = path.join(__dirname, '..', 'dist');
const BuildAsarDir = path.join(BuildDir, 'win-unpacked', 'resources', 'app.asar');

if (fs.existsSync(BuildDir)) {
    fs.rmSync(BuildDir, { force: true, recursive: true });
}

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


const _color = {
    open: '\u001b[32m',
    close: '\u001b[39m',
};

if (fs.existsSync(BuildAsarDir)) {
    const AsarPackerPath = path.join(BuildDir, 'packed.asar');
    fs.copyFileSync(BuildAsarDir, AsarPackerPath);

    const buff = fs.readFileSync(AsarPackerPath);
    const hash = crypto.createHash('sha256').update(buff).digest('hex');
    console.log(_color.open + 'Asar packed hash: ' + _color.close + hash);
}

const InstallerPath = path.join(BuildDir, 'SoundCloudInstaller.exe');

fs.readdirSync(BuildDir).forEach(file => {
    if (file.endsWith('.exe')) {
        if (fs.existsSync(InstallerPath)) {
            console.log('Installer already exist, skip... ' + file);
            return;
        }
        fs.renameSync(path.join(BuildDir, file), InstallerPath);
    }
});

if (fs.existsSync(InstallerPath)) {
    const buff = fs.readFileSync(InstallerPath);
    const hash = crypto.createHash('sha256').update(buff).digest('hex');
    console.log(_color.open + 'Installer hash:   ' + _color.close + hash);
}