<p align="center">
<a href="https://soundcloud.com">
<img src="https://raw.githubusercontent.com/zxcnoname666/SoundCloud-Desktop/main/icons/appLogo.png" width="180px" style="border-radius: 50%;" />
</a>
</p>

<h1 align="center"><a href="https://web.soundcloud.work.gd/">🎵 SoundCloud Desktop</a></h1>

<p align="center">
<b>The Best Unofficial SoundCloud Desktop Client for Windows, Linux & macOS</b><br>
Listen to music without ads and geo-restrictions
</p>

<p align="center">
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest">
<img src="https://img.shields.io/github/v/release/zxcnoname666/SoundCloud-Desktop?style=for-the-badge&logo=github&color=FF5500&label=Version" alt="Latest Release"/>
</a>
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/releases">
<img src="https://img.shields.io/github/downloads/zxcnoname666/SoundCloud-Desktop/total?style=for-the-badge&logo=download&color=FF5500&label=Downloads" alt="Downloads"/>
</a>
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/stargazers">
<img src="https://img.shields.io/github/stars/zxcnoname666/SoundCloud-Desktop?style=for-the-badge&logo=github&color=FF5500&label=Stars" alt="Stars"/>
</a>
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/blob/main/LICENSE">
<img src="https://img.shields.io/badge/License-MIT-FF5500?style=for-the-badge" alt="License"/>
</a>
</p>

<p align="center">
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest">
<img src="https://img.shields.io/badge/⬇️_Download-Latest_Release-FF5500?style=for-the-badge&logo=download" alt="Download"/>
</a>
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/blob/main/README.md">
<img src="https://img.shields.io/badge/🇷🇺_Русский-README-0066FF?style=for-the-badge" alt="Russian"/>
</a>
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/discussions">
<img src="https://img.shields.io/badge/💬_Community-Discussions-00CC66?style=for-the-badge&logo=github" alt="Discussions"/>
</a>
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/issues">
<img src="https://img.shields.io/badge/🐛_Bugs-Issues-FF3333?style=for-the-badge&logo=github" alt="Issues"/>
</a>
</p>

---

## 🎯 What is SoundCloud Desktop?

**SoundCloud Desktop** is the **best unofficial desktop client for SoundCloud** with advanced features not available in
the official web player. The app is specifically designed for comfortable music listening on your computer with complete
ad blocking and bypassing all restrictions.

### 🔥 Why Choose SoundCloud Desktop?

<table>
<tr>
<td width="50%">

#### 🎨 Full Customization

- Built-in **CSS editor** powered by Monaco Editor
- Real-time preview of changes
- IntelliSense and syntax highlighting
- Persistent styles between sessions

#### 🚫 Zero Ads

Built-in blocking of **39+ tracking and advertising domains**:

- Google Analytics, DoubleClick
- Quantcast, Taboola
- Facebook Pixel, Twitter Analytics
- And many other advertising services

#### 🌍 Bypass Geo-Restrictions

- Smart detection of regional blocking
- Automatic proxy switching
- Access blocked tracks from any region
- Works even with slow internet

#### ⚡ Lightning Fast

- Aggressive **4-day caching** of static assets
- Optimized audio segment caching (.m4s, .ts)
- Blazing fast loading thanks to TypeScript

</td>
<td width="50%">

#### 🔒 Smart Proxy System

- **Automatic rotation** on quota exhaustion
- Detection of "hanging" connections after 19KB
- Multiple proxies for reliability
- Cloudflare Workers with one click

#### 🎵 Music Optimized

- Efficient media segment caching
- Smooth playback without delays
- Minimal traffic consumption
- High-quality audio support

#### 🌐 Multilingual

- Full support for **Russian** and **English** languages
- Automatic system language detection
- Easy language switching in settings

#### 🖥️ Cross-Platform

- **Windows** 10/11 (Installer)
- **Linux** (AppImage)
- **macOS** (Intel + Apple Silicon)

</td>
</tr>
</table>

### 🎧 Who is this app for?

✅ **Music producers and DJs** — full-featured desktop player for work  
✅ **Users in restricted regions** — bypass geo-blocking and access all of SoundCloud  
✅ **Anyone tired of ads** — clean music listening without distractions  
✅ **Musicians** — manage multiple SoundCloud accounts  
✅ **Podcast listeners** — convenient desktop app for podcasts  
✅ **Music enthusiasts** — extended capabilities for music streaming

---

## 📥 Installation

### 💻 Windows

<details>
<summary><b>Expand Windows Installation Guide</b></summary>

1. Go to the [releases page](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Download **`SoundCloudInstaller.exe`** (universal installer)
3. Run the installer
4. Follow the setup wizard instructions
5. Done! The app will appear in the Start menu

**System Requirements:**

- Windows 10 (1809+) or Windows 11
- 4 GB RAM (8 GB recommended)
- 200 MB free disk space

</details>

### 🐧 Linux

<details>
<summary><b>Expand Linux Installation Guide</b></summary>

1. Go to the [releases page](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Download **`soundcloud-{version}.AppImage`** (e.g., `soundcloud-3.2.0.AppImage`)
3. Make it executable:

```bash
chmod +x soundcloud-*.AppImage
```

4. Run the application:

```bash
./soundcloud-*.AppImage
```

**System Requirements:**

- Ubuntu 20.04+ / Debian 11+ / Fedora 35+ or equivalent
- 4 GB RAM
- 200 MB free disk space

</details>

### 🍎 macOS

<details>
<summary><b>Expand macOS Installation Guide</b></summary>

1. Go to the [releases page](https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest)
2. Download the file for your processor:
    - **Apple Silicon (M1/M2/M3):** `soundcloud-{version}-arm64.dmg`
    - **Intel:** `soundcloud-{version}.dmg`
3. Open the downloaded DMG file
4. Drag **SoundCloud Desktop** to the **Applications** folder
5. First launch: `Right click → Open` (due to macOS security)

**System Requirements:**

- macOS 11 Big Sur or newer
- 4 GB RAM
- 200 MB free disk space

</details>

---

## 🔗 App Protocol `sc://`

Open any SoundCloud page directly in the app from your browser!

### How it works?

Simply replace `https://soundcloud.com/` with `sc://` in any link:

```
https://soundcloud.com/discover  →  sc://discover
https://soundcloud.com/you/library  →  sc://you/library
https://soundcloud.com/artist/track  →  sc://artist/track
```

### Usage Examples:

- **Open top charts:** `sc://charts`
- **Open library:** `sc://you/library`
- **Open playlist:** `sc://username/sets/playlist-name`

**Bonus:** The app has a built-in URL bar (like in browsers) for quick navigation! 🚀

---

## 🎨 Customization & Settings

### CSS Editor

SoundCloud Desktop includes a powerful built-in CSS editor powered by **Monaco Editor** (same engine as VS Code):

**Features:**

- ✏️ **Real-time preview** — see changes instantly
- 💾 **Auto-save** — styles applied on every launch
- 🎯 **IntelliSense** — autocomplete and syntax highlighting
- 🔄 **Reset to default** — restore with one click
- 🌙 **Dark theme** — styled to match SoundCloud aesthetic

**How to open:**  
Click the ⚙️ gear icon in the top-right corner of the window

**File location:**

- Windows: `%APPDATA%\soundcloud\custom-styles.css`
- Linux/macOS: `~/.config/soundcloud/custom-styles.css`

### Update Notifications

Beautiful custom update notifications with:

- 📋 Markdown changelog with formatting
- 📊 Download progress bar
- 🔗 Clickable links
- 🎯 One-click installation

### 🗂️ Data Management

The settings window includes powerful data management tools:

**Clear Cache**

Remove cached files and request data to free up disk space:

- **What it clears**: Asset cache (images, scripts, media segments), Electron session cache
- **Cache location**: System temp directory (`soundcloud-cache`)
- **Effect**: May temporarily slow down the app on next launch as assets are re-downloaded
- **When to use**: When experiencing caching issues or to free up space

**Clear All Data**

Complete reset of all application data:

- **What it removes**:
    - Custom CSS styles
    - All application settings
    - Cached data
- **Effect**: Resets the app to its initial state
- **⚠️ Warning**: This action cannot be undone!
- **When to use**: When troubleshooting issues or starting fresh

Both actions show real-time data size and require confirmation before proceeding.

---

## ⚙️ Configuration

### 🌐 Language and Interface Settings

To configure the language, create a `config.json5` file in the app directory:

**Location:**

- Windows: `%APPDATA%\soundcloud\config.json5`
- Linux/macOS: `~/.config/soundcloud/config.json5`

**File format:**

```json5
{
  // Automatic updates
  autoUpdate: true,

  // Localization settings
  translations: {
    // Russian (also used for kk, ky, be locales)
    ru: {
      proxy_available_not_found: "Доступные прокси-серверы не найдены",
      // ... other translations
    }
  }
}
```

**Configuration Priority:**

1. **User folder** (highest priority): `%APPDATA%\soundcloud\config.json5` (Windows) or
   `~/.config/soundcloud/config.json5` (Linux/macOS)
2. **App folder** (built-in): `config.json5` in the directory with the executable

> **Note:** Proxy settings are loaded from a **separate file** `config.proxy.json5` (see "Proxy Configuration" section
> below).

### 🔒 Proxy Configuration (for bypassing geo-restrictions)

<details>
<summary><b>📖 Detailed Proxy Setup Guide</b></summary>

#### Why do you need a proxy?

Proxy allows bypassing regional blocking and accessing blocked tracks without VPN.

#### Smart Proxy Features:

🔍 **Automatic Regional Blocking Detection**  
The app automatically recognizes "hanging" connections after transferring 19 KB of data

🔄 **Automatic Proxy Rotation**  
When receiving 429/500 errors, the app automatically switches to the next proxy from the list

💾 **Aggressive Caching**  
4-day cache for static files (.js, .css, images, audio segments)

🎵 **Media Segment Optimization**  
Smart caching of .m4s and .ts segments with automatic query parameter removal

🚫 **Enhanced Ad Blocking**  
39+ tracking/advertising domains (Google Analytics, Quantcast, Taboola, etc.)

📊 **Usage Metrics**  
Collection of domain usage statistics in development mode

#### Creating Configuration

**Create a file** `config.proxy.json5` in one of the directories:

**Configuration Loading Priority:**

1. **User folder** (highest priority):
    - Windows: `%APPDATA%\soundcloud\config.proxy.json5`
    - Linux/macOS: `~/.config/soundcloud/config.proxy.json5`

2. **App folder** (built-in): `config.proxy.json5` in the directory with the executable

3. **No file**: If no file is found, an empty proxy array `{ proxy: [] }` is used

> **Important:** Proxy configuration is completely independent from `config.json5`. The application searches for
`config.proxy.json5` in the specified order and uses the first one found.

#### Configuration Format:

```json5
{
  "proxy": [
    "https://your-worker.workers.dev",
    "http://proxy.example.com:8080",
    "https://backup-proxy.example.com"
  ]
}
```

**Disabling Proxy:** To completely disable proxy usage, specify an empty array:

```json5
{
  "proxy": []
}
```

**Multiple Proxies:** When quota is exhausted on one proxy (429/500 errors), the app automatically switches to the next.
When all proxies are unavailable, they are restored and rotation starts again.

#### Cloudflare Worker Proxy (Recommended) ⭐

The easiest and free way to set up a proxy:

1. Use the ready-made Worker code from `_proxy/cloudflare-proxy.js`
2. Deploy it to Cloudflare Workers (free tier: 100,000 requests/day)
3. Add your Worker URL to `config.proxy.json5`
4. Detailed instructions: `_proxy/README.md`

**Alternative Proxy Formats:**

- `http://host:port`
- `https://host:port`

</details>

---

## 🛠️ Development

<details>
<summary><b>👨‍💻 For Developers</b></summary>

### Requirements

- **Node.js** 22+ (recommended 25 LTS)
- **pnpm** 10+ (package manager)
- **Rust** 1.70+ (for native modules)

### Quick Start

```bash
# 1. Install pnpm (if not already installed)
npm install -g pnpm

# 2. Clone the repository
git clone https://github.com/zxcnoname666/SoundCloud-Desktop.git
cd SoundCloud-Desktop

# 3. Install dependencies
pnpm install

# 4. Run in development mode
pnpm dev

# 5. Build for production
pnpm build
```

### Available Commands

| Command                 | Description                             |
|-------------------------|-----------------------------------------|
| `pnpm dev`              | Build and run in dev mode               |
| `pnpm dev:watch`        | Run with skipping copy                  |
| `pnpm build`            | Full production build for all platforms |
| `pnpm build:app`        | Build app only                          |
| `pnpm build:production` | Production build without packaging      |
| `pnpm start`            | Run built application                   |
| `pnpm type-check`       | Check TypeScript types                  |
| `pnpm lint`             | Check code with ESLint                  |
| `pnpm biome:check`      | Check code with Biome                   |
| `pnpm biome:write`      | Format code with Biome                  |
| `pnpm format`           | Auto-format code                        |

</details>

---

## 🤝 Support the Project

### ⭐ Star the Repo!

If you like SoundCloud Desktop — give this repository a ⭐!

### 🐛 Found a Bug?

[Create an issue](https://github.com/zxcnoname666/SoundCloud-Desktop/issues/new) with a detailed description of the
problem.

### 💡 Have an Idea?

[Open a discussion](https://github.com/zxcnoname666/SoundCloud-Desktop/discussions/new) and share your suggestions!

### 🔧 Want to Contribute?

Pull requests are welcome! For major changes, please open an issue first to discuss.

---

## 📊 Statistics

<p align="center">
<img src="https://api.star-history.com/svg?repos=zxcnoname666/SoundCloud-Desktop&type=Date" alt="Star History Chart" />
</p>

<p align="center">
<img src="https://zxcnoname666.github.io/download-history/zxcnoname666_SoundCloud-Desktop.svg" alt="Downloads Chart" />
</p>

<p align="center">
<img src="https://count.getloli.com/get/@soundcloud-desktop" alt="Visitors" />
</p>

---

## 📄 License

This project is distributed under the MIT License. See the [LICENSE](LICENSE) file for details.

**Disclaimer:** Names and images belong to [SoundCloud](https://soundcloud.com). This application is not affiliated with
SoundCloud Ltd.

---

## 📎 Related Terms

*For improved project discoverability:* `soundcloud desktop`, `soundcloud app`, `soundcloud client`,
`soundcloud windows`, `soundcloud linux`, `soundcloud macos`, `soundcloud no ads`, `soundcloud bypass geo-blocking`,
`soundcloud desktop client`, `soundcloud player`, `unofficial soundcloud`, `soundcloud proxy`, `desktop music player`,
`soundcloud alternative`, `music streaming app`, `soundcloud downloader`, `soundcloud desktop application`

---

<p align="center">
<b>Made with ❤️ for music without limitations</b>
</p>

<p align="center">
<a href="https://github.com/zxcnoname666/SoundCloud-Desktop/releases/latest">
<img src="https://img.shields.io/badge/⬇️_Download_Now-FF5500?style=for-the-badge&logo=download&logoColor=white" alt="Download Now" height="50"/>
</a>
</p>
