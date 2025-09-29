#!/usr/bin/env node

const {execSync} = require('node:child_process');
const {existsSync, mkdirSync, cpSync, readdirSync} = require('node:fs');
const {join} = require('node:path');

class NativeBuilder {
    constructor() {
        this.rootDir = process.cwd();
        this.nativeDir = join(this.rootDir, 'native_utils');
        this.binsDir = join(this.rootDir, 'bins');
    }

    async build() {
        console.log('🦀 Building native modules...');

        if (!existsSync(this.nativeDir)) {
            console.log('❌ Native utils source not found, skipping native build');
            return;
        }

        this.checkRustInstallation();
        await this.buildRustModule();
        this.copyNativeModule();

        console.log('✅ Native modules built successfully');
    }

    checkRustInstallation() {
        try {
            execSync('cargo --version', {stdio: 'pipe'});
        } catch (error) {
            console.error('❌ Rust/Cargo not found. Please install Rust first:');
            console.error('   Visit: https://rustup.rs/');
            process.exit(1);
        }
    }

    async buildRustModule() {
        try {
            console.log('🔨 Compiling Rust native module...');

            execSync('cargo build --release', {
                cwd: this.nativeDir,
                stdio: 'inherit',
            });

            console.log('✅ Rust compilation completed');
        } catch (error) {
            console.error('❌ Rust compilation failed');
            throw error;
        }
    }

    copyNativeModule() {
        const targetDir = join(this.nativeDir, 'target/release');

        // Determine the correct native library name based on platform
        let nativeLibName;
        if (process.platform === 'win32') {
            nativeLibName = 'native_utils.dll';
        } else if (process.platform === 'darwin') {
            nativeLibName = 'libnative_utils.dylib';
        } else {
            nativeLibName = 'libnative_utils.so';
        }

        const srcPath = join(targetDir, nativeLibName);

        if (!existsSync(srcPath)) {
            console.warn(`⚠️  Native module not found at ${srcPath}`);
            console.warn('Available files in target/release:');
            try {
                const files = readdirSync(targetDir);
                console.warn(files.join(', '));
            } catch (e) {
                console.warn('Could not list target directory');
            }
            throw new Error(`Native module not found: ${nativeLibName}`);
        }

        if (!existsSync(this.binsDir)) {
            mkdirSync(this.binsDir, {recursive: true});
        }

        const destPath = join(this.binsDir, 'native_utils.node');

        try {
            cpSync(srcPath, destPath);
            console.log(`📁 Copied native module to ${destPath}`);
        } catch (error) {
            console.error('❌ Failed to copy native module:', error);
            throw error;
        }
    }
}

if (require.main === module) {
    const builder = new NativeBuilder();
    builder.build().catch((error) => {
        console.error('Native build failed:', error);
        process.exit(1);
    });
}

module.exports = NativeBuilder;
