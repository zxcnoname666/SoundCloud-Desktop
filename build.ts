#!/usr/bin/env tsx

import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { build as esbuild } from 'esbuild';

interface BuildOptions {
  skipTypeCheck?: boolean;
  skipCopy?: boolean;
  production?: boolean;
}

class Builder {
  private rootDir = process.cwd();
  private distDir = join(this.rootDir, 'dist');

  constructor(private options: BuildOptions = {}) {}

  async build(): Promise<void> {
    console.info('🚀 Starting build process...');

    this.cleanDistDirectory();
    await this.buildNativeModules();

    if (!this.options.skipTypeCheck) {
      await this.typeCheck();
    }

    await this.bundleWithEsbuild();

    if (!this.options.skipCopy) {
      this.copyAssets();
    }

    console.info('✅ Build completed successfully!');
    console.info(`📦 Output directory: ${this.distDir}`);
  }

  private cleanDistDirectory(): void {
    if (existsSync(this.distDir)) {
      console.info('🧹 Cleaning dist directory...');
      rmSync(this.distDir, { recursive: true });
    }

    mkdirSync(this.distDir, { recursive: true });
  }

  private async typeCheck(): Promise<void> {
    console.info('📝 Type checking...');
    try {
      execSync('pnpm exec tsc --noEmit', { stdio: 'inherit' });
      console.info('✅ Type check passed');
    } catch (error) {
      console.error('❌ Type check failed');
      process.exit(1);
    }
  }

  private async bundleWithEsbuild(): Promise<void> {
    console.info('📦 Bundling with esbuild...');
    try {
      const isProduction = this.options.production;

      await esbuild({
        entryPoints: [join(this.rootDir, 'src/init.ts')],
        bundle: true,
        platform: 'node',
        target: 'node22',
        format: 'esm',
        outfile: join(this.distDir, 'init.js'),
        external: ['electron'],
        minify: isProduction || true,
        sourcemap: !isProduction,
        keepNames: true,
        logLevel: 'info',
        treeShaking: true,
        banner: {
          js: 'import { createRequire } from "module"; const require = createRequire(import.meta.url);',
        },
        define: {
          'process.env.NODE_ENV': isProduction ? '"production"' : '"development"',
        },
      });

      console.info('✅ Bundle created successfully');
    } catch (error) {
      console.error('❌ Bundling failed:', error);
      process.exit(1);
    }
  }

  private async buildNativeModules(): Promise<void> {
    const nativeScriptPath = join(this.rootDir, 'scripts/build-native.cjs');

    if (!existsSync(nativeScriptPath)) {
      console.info('⚠️  Native build script not found, skipping native build');
      return;
    }

    try {
      console.info('🦀 Building native modules...');
      // Используем Node.js напрямую для избежания проблем с путями в tsx
      execSync(`node "${nativeScriptPath}"`, {
        stdio: 'inherit',
        cwd: this.rootDir,
        shell: true,
      });
    } catch (error) {
      console.error('❌ Native build failed:', error);
      process.exit(1);
    }
  }

  private copyAssets(): void {
    const assets = [
      { src: 'frontend', desc: 'frontend files' },
      { src: 'icons', desc: 'icons' },
      { src: 'bins', desc: 'native binaries' },
    ];

    const configFiles = ['config.json5', 'config.proxy.json5', 'LICENSE'];

    // Copy directories
    for (const asset of assets) {
      const srcPath = join(this.rootDir, asset.src);
      if (existsSync(srcPath)) {
        console.info(`📁 Copying ${asset.desc}...`);
        cpSync(srcPath, join(this.distDir, asset.src), { recursive: true });
      }
    }

    // Copy individual files
    console.info('📁 Copying config files...');
    for (const file of configFiles) {
      const srcPath = join(this.rootDir, file);
      if (existsSync(srcPath)) {
        cpSync(srcPath, join(this.distDir, file));
      }
    }

    // Generate minimal package.json for electron-builder
    this.generatePackageJson();
  }

  private generatePackageJson(): void {
    const rootPackageJson = JSON.parse(readFileSync(join(this.rootDir, 'package.json'), 'utf-8'));

    const distPackageJson = {
      name: rootPackageJson.name,
      version: rootPackageJson.version,
      description: rootPackageJson.description,
      type: rootPackageJson.type,
      main: 'init.js',
    };

    writeFileSync(
      join(this.distDir, 'package.json'),
      JSON.stringify(distPackageJson, null, 2),
      'utf-8'
    );
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: BuildOptions = {
  skipTypeCheck: args.includes('--skip-type-check'),
  skipCopy: args.includes('--skip-copy'),
  production: args.includes('--production') || process.env.NODE_ENV === 'production',
};

const builder = new Builder(options);
builder.build().catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
