const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execSync } = require("node:child_process");

console.log('Checking if "pnpm" is installed');
try {
  execSync("pnpm -h", {
    cwd: path.join(__dirname, ".."),
  });
} catch {
  console.log("pnpm is not installed...");
  console.log("installing pnpm...");

  let command;
  let arg = {};

  switch (process.platform) {
    case "win32": {
      command =
        "Invoke-WebRequest https://get.pnpm.io/install.ps1 -UseBasicParsing | Invoke-Expression";
      arg = { shell: "powershell.exe" };
      break;
    }
    default: {
      command = "wget -qO- https://get.pnpm.io/install.sh | sh -";
      break;
    }
  }

  if (!command) {
    console.error("error.. os is not defined, install pnpm manually");
    process.exit(1);
  }

  execSync(command, {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    ...arg,
  });
  console.log("\n");
}

console.log("Installing npm modules...\n");
execSync("pnpm i", {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
});

console.log('\nChecking if "electron-builder" is installed');
try {
  const version_installed = execSync("electron-builder --version", {
    cwd: path.join(__dirname, ".."),
  });
  const version_latest = execSync("pnpm view electron-builder version", {
    cwd: path.join(__dirname, ".."),
  });

  if (parseFloat(`${version_latest}`) > parseFloat(`${version_installed}`)) {
    console.log(
      `Available new version of electrion-builder. Installed version: ${version_installed.toString().trim()} // Available version: ${version_latest.toString().trim()}\n`,
    );
    throw new Error("update electron-builder");
  }
} catch {
  execSync("pnpm i electron-builder -g", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  console.log("\n");
}

console.log('Checking if "@napi-rs/cli" is installed');
try {
  execSync("napi -h", {
    cwd: path.join(__dirname, ".."),
  });
} catch {
  execSync("pnpm i @napi-rs/cli -g", {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
  });
  console.log("\n");
}

console.log("Building native modules...");
execSync("pnpm run build", {
  cwd: path.join(__dirname, "native_utils"),
  stdio: "inherit",
});

const BuildDir = path.join(__dirname, "..", "dist");
const BuildAsarDir = path.join(
  BuildDir,
  "win-unpacked",
  "resources",
  "app.asar",
);

if (fs.existsSync(BuildDir)) {
  fs.rmSync(BuildDir, { force: true, recursive: true });
}

const BinsDirPath = path.join(__dirname, "..", "bins");

if (!fs.existsSync(BinsDirPath)) {
  fs.mkdirSync(BinsDirPath, { recursive: true });
}

const nativeUtilsBinPath = path.join(BinsDirPath, "native_utils.node");
const nativeUtilsPath = path.join(
  __dirname,
  "native_utils",
  "native_utils.node",
);

if (fs.existsSync(nativeUtilsPath)) {
  if (fs.existsSync(nativeUtilsBinPath)) {
    fs.rmSync(nativeUtilsBinPath, { force: true, recursive: true });
  }

  fs.copyFileSync(nativeUtilsPath, nativeUtilsBinPath);
}

console.log("\nBuilding electron application...");
execSync("electron-builder", {
  cwd: path.join(__dirname, ".."),
  stdio: "inherit",
});

const _color = {
  open: "\u001b[32m",
  close: "\u001b[39m",
};

if (fs.existsSync(BuildAsarDir)) {
  const AsarPackerPath = path.join(BuildDir, "packed.asar");
  fs.copyFileSync(BuildAsarDir, AsarPackerPath);

  const buff = fs.readFileSync(AsarPackerPath);
  const hash = crypto.createHash("sha256").update(buff).digest("hex");
  console.log(_color.open + "Asar packed hash: " + _color.close + hash);
}

const InstallerPath = path.join(BuildDir, "SoundCloudInstaller.exe");

if (fs.existsSync(InstallerPath)) {
  const buff = fs.readFileSync(InstallerPath);
  const hash = crypto.createHash("sha256").update(buff).digest("hex");
  console.log(_color.open + "Installer hash:   " + _color.close + hash);
}
