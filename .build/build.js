const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');

console.log('Installing npm modules...\n');
execSync('npm i', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
});


console.log('\nChecking if "electron-builder" is installed');
try {
    const version_installed = execSync('electron-builder --version', {
        cwd: path.join(__dirname, '..'),
    });
    const version_latest = execSync('npm view electron-builder version', {
        cwd: path.join(__dirname, '..'),
    });

    if (parseFloat(version_latest) > parseFloat(version_installed)) {
        console.log(`Available new version of electrion-builder. Installed version: ${version_installed.toString().trim()} // Available version: ${version_latest.toString().trim()}\n`);
        throw new Error('update electron-builder');
    }
} catch {
    execSync('npm i electron-builder -g', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
    });
    console.log('\n');
}


console.log('Checking if "@napi-rs/cli" is installed');
try {
    execSync('napi -h', {
        cwd: path.join(__dirname, '..'),
    });
} catch {
    execSync('npm i @napi-rs/cli -g', {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
    });
    console.log('\n');
}

console.log('Building native modules...');
execSync('npm run build', {
    cwd: path.join(__dirname, 'efficiency'),
    stdio: 'inherit',
});

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

if (!fs.existsSync(BinsDirPath)) {
    fs.mkdirSync(BinsDirPath, { recursive: true });
}

const screnameBinPath = path.join(BinsDirPath, 'sc-rename.exe');
const screnamePath = path.join(__dirname, 'sc-rename', 'target', 'release', 'sc-rename.exe');

if (fs.existsSync(screnamePath)) {
    if (fs.existsSync(screnameBinPath)) {
        fs.rmSync(screnameBinPath, { force: true, recursive: true });
    }

    fs.copyFileSync(screnamePath, screnameBinPath);
}

const efficiencyBinPath = path.join(BinsDirPath, 'efficiency.node');
const efficiencyPath = path.join(__dirname, 'efficiency', 'efficiency.node');

if (fs.existsSync(efficiencyPath)) {
    if (fs.existsSync(efficiencyBinPath)) {
        fs.rmSync(efficiencyBinPath, { force: true, recursive: true });
    }

    fs.copyFileSync(efficiencyPath, efficiencyBinPath);
}


console.log('\nBuilding electron application...');
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