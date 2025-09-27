<p>
<a href="https://soundcloud.com" alt="soundcloud">
<img src="https://raw.githubusercontent.com/zxcnoname666/SoundCloud-Desktop/main/icons/appLogo.png" width="200px" align="right" style="border-radius: 50%;" />
</a>

# SoundCloud Desktop

<p align="center">
<a href="https://soundcloud.com" alt="soundcloud">
<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=500&pause=1000&color=F76000&center=true&vCenter=true&repeat=false&width=435&height=25&lines=SoundCloud+Desktop">
</a>
</p>
<p align="center">
The unofficial SoundCloud desktop app for Windows, Linux & macOS
</p>

# Select language

### EN [RU](https://github.com/zxcnoname666/SoundCloud-Desktop/blob/main/README-RU.md)

# ✨ Features

- **🌙 Dark theme** - Modern dark interface
- **🌍 Bypass geo-blocking** - Access blocked tracks from any region
- **🚫 AdBlock** - Built-in ad blocking for clean experience
- **⚡ Fast & lightweight** - Optimized TypeScript codebase with bundling
- **🔒 Proxy support** - Built-in proxy for unrestricted access
- **🔗 Protocol support** - Open SoundCloud links directly with `sc://` protocol
- **🖥️ Cross-platform** - Available for Windows, Linux & macOS

# App Protocol

You can open the page in the application directly from the browser using the
`sc://` protocol.

> You need to replace `https://soundcloud.com/...` to `sc://...` like
> `https://soundcloud.com/discover` => `sc://discover`

You can also navigate in app by using url-navbar (like in browsers)

# 📥 Download & Install

## Windows

1. Go to [latest release page](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Download `SoundCloudInstaller.exe`
3. Run the installer and follow instructions

## Linux

1. Go to [latest release page](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Download `soundcloud-*.AppImage`
3. Make it executable: `chmod +x soundcloud-*.AppImage`
4. Run the AppImage

## macOS

1. Go to [latest release page](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Download `soundcloud-*.dmg`
3. Open the DMG and drag the app to Applications

# ⚙️ Configuration

## Language Settings

You can customize the application language via `config.json5` file in the app directory.

## 🔒 Proxy Configuration

Configure proxy settings to bypass geo-restrictions:

**Config locations (priority order):**

1. **User folder**: `%APPDATA%/soundcloud/config.proxy.json5` (Windows) or `~/.config/soundcloud/config.proxy.json5` (
   Linux/macOS)
2. **App folder**: `config.proxy.json5` in app directory

**Configuration format:**

```json5
{
  "proxy": [
    "https://your-worker.workers.dev",
    "http://proxy.example.com:8080"
  ]
}
```

**Cloudflare Worker Proxy (Recommended):**

1. Use the ready-made Worker code from `_proxy/cloudflare-proxy.js`
2. Deploy it to Cloudflare Workers (free tier available)
3. Add your Worker URL to proxy config
4. See `_proxy/README.md` for detailed setup instructions

**Alternative proxy formats:**

- `http://host:port`, `https://host:port`

# 🔨 Development & Building

## Requirements

- **Node.js** 18+
- **pnpm** 8+
- **Rust** (for native modules)

## Setup

```bash
# Install pnpm
npm install -g pnpm

# Install dependencies  
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build
```

# Credits

Names and images own by [SoundCloud](https://soundcloud.com)

This app was created out of personal necessity.

<p align="center">
<a href="javascript:void(0)">
<img src="https://count.getloli.com/get/@soundcloud-desktop" width="200px" />
</a>
</p>
<p align="center">
<a href="javascript:void(0)">
<img src="https://img.shields.io/github/downloads/zxcnoname666/SoundCloud-Desktop/total?color=fd4313&style=plastic" />
<img src="https://img.shields.io/github/v/release/zxcnoname666/SoundCloud-Desktop.svg?color=#fd4313&style=plastic" />
</a>
</p>
