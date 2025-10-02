<p>
<a href="https://soundcloud.com" alt="soundcloud">
<img src="https://raw.githubusercontent.com/zxcnoname666/SoundCloud-Desktop/main/icons/appLogo.png" width="200px" align="right" style="border-radius: 50%;" />
</a>

# 🎵 SoundCloud Desktop - Unofficial Desktop Client

[![Downloads](https://img.shields.io/github/downloads/zxcnoname666/SoundCloud-Desktop/total)](https://github.com/zxcnoname666/SoundCloud-Desktop/releases)
[![Stars](https://img.shields.io/github/stars/zxcnoname666/SoundCloud-Desktop)](https://github.com/zxcnoname666/SoundCloud-Desktop/stargazers)
[![License](https://img.shields.io/github/license/zxcnoname666/SoundCloud-Desktop)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/zxcnoname666/SoundCloud-Desktop)](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)

> **The best unofficial SoundCloud desktop application** for Windows, Linux & macOS with built-in ad-blocking, geo-unblocking, and proxy support.

[⬇️ Download Latest Release](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest) | [📖 Discussions](https://github.com/zxcnoname666/SoundCloud-Desktop/discussions) | [🐛 Report Bug](https://github.com/zxcnoname666/SoundCloud-Desktop/issues)

# Select language

### EN [RU](https://github.com/zxcnoname666/SoundCloud-Desktop/blob/main/README-RU.md)

## Why Choose SoundCloud Desktop?

- **🎧 Native Desktop Experience** - Full-featured SoundCloud desktop client
- **🌙 Beautiful Dark Theme** - Eye-friendly interface for music lovers
- **🌍 Access Anywhere** - Bypass geographical restrictions and geo-blocking
- **🚫 Zero Ads** - Built-in ad blocker for uninterrupted music streaming
- **⚡ Lightning Fast** - Optimized TypeScript codebase, faster than web version
- **🔒 Privacy Focused** - Proxy support for secure and private listening
- **🖥️ Cross-Platform** - Works on Windows 10/11, Linux, and macOS
- **💾 Lightweight** - Small footprint, minimal system resources

## Keywords & Use Cases

Perfect for:
- Music producers and DJs looking for a dedicated SoundCloud desktop player
- Users in restricted regions needing geo-unblocking
- Anyone tired of SoundCloud web ads
- Musicians managing multiple SoundCloud accounts
- Podcast listeners preferring desktop apps
- Streaming enthusiasts wanting offline-capable music player

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

Also known as: SoundCloud Desktop Client, SoundCloud App, Unofficial SoundCloud, Desktop SoundCloud Player


<p align="center">
  <img src="https://api.star-history.com/svg?repos=zxcnoname666/Soundcloud-Desktop&type=Date"/>
</p>
<p align="center">
   <img src="https://count.getloli.com/get/@soundcloud-desktop">
</p>
