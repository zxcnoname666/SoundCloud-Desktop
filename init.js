const { app, BrowserWindow } = require("electron");
const { NotifyManager } = require("notify-manager-electron");
const { Client } = require("qurre-socket");
const Setup = require("./modules/Setuper");
const ProxyManager = require("./modules/ProxyManager");
const Extensions = require("./modules/Extensions");
const tpu = require("./modules/TCPPortUsing");

let win;
const dev = false;
const AppPort = dev ? 3535 : 45828;

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("web-contents-created", (ev, contents) => {
  try {
    console.log("window created: " + contents.getType());
  } catch {
  }

  setTimeout(() => {
    const interval = setInterval(() => {
      const value = enableIdle();
      if (value === 0) {
        clearInterval(interval);
      }
    }, 10000);
    enableIdle();
  }, 1000);

  Setup.hookNewWindow(contents);
  Setup.cors(contents.session);

  if (dev) {
    contents.openDevTools({ mode: "detach" });
  }

  function enableIdle() {
    if (contents.isDestroyed()) {
      return 0;
    }

    const pid = contents.getOSProcessId();
    if (pid === 0) {
      return 1;
    }

    if (contents.getType() === "webview" && Setup.getIsPlaying()) {
      Extensions.setEfficiency(pid, false);
      return 1;
    }

    if (contents.getType() === "window" && Setup.getisActive()) {
      Extensions.setEfficiency(pid, false);
      return 1;
    }

    Extensions.setEfficiency(pid);
    return 1;
  }
});

app.whenReady().then(() => {
  startup();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      startup();
    }
  });
});

async function startup() {
  let _portUse = await PortUsing();
  if (_portUse) {
    setTimeout(() => app.quit(), 1000);
    return;
  }

  if (Setup.getCloseAll()) {
    setTimeout(() => app.quit(), 1000);
    return;
  }

  app.configureHostResolver({
    secureDnsMode: "secure",
    secureDnsServers: [
      "https://dns.quad9.net/dns-query",
      "https://dns9.quad9.net/dns-query",
      "https://cloudflare-dns.com/dns-query",
    ],
  });

  const loaderWin = await Setup.loaderWin();
  const nmanager = new NotifyManager();

  await Setup.autoUpdate();

  await ProxyManager.Init(nmanager);

  // setTimeout(() => {
  //     try {
  //         nmanager.getWindow().destroy()
  //     } catch {
  //     }
  // }, 15000);

  Setup.setupTasks();

  Extensions.protocolInject();

  win = Setup.create();

  win.once("ready-to-show", () => {
    setTimeout(() => {
      win.show();
      try {
        loaderWin.close();
      } catch {
      }
    }, 1000); // safe eyes from blink by chromium
  });
  win.on("close", (e) => {
    e.preventDefault();
    win?.hide();
  });

  require("./modules/Tray")(win);

  Setup.cors(win.webContents.session);
  Setup.binds(win);

  _portUse = await PortUsing();
  if (_portUse) {
    setTimeout(() => app.quit(), 1000);
    return;
  }

  require("./modules/Server")(AppPort, win);

  await win.loadFile(__dirname + "/frontend/main.html");
  win.send("load-url", await Setup.getStartUrl());

  Extensions.sleeper.enable();
}

async function PortUsing() {
  const _portUse = await tpu(AppPort, "127.0.0.1");

  if (!_portUse) {
    return false;
  }

  setTimeout(() => app.quit(), 1000);

  const _client = new Client(AppPort);
  _client.emit("OpenApp");

  const url = Setup.getStartArgsUrl();
  if (url.length > 1) {
    _client.emit("SetUrl", url);
  }

  if (Setup.getCloseAll()) {
    _client.emit("CloseAll");
  }

  return true;
}
