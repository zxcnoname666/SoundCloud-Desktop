# Flatpak Build Instructions

This directory contains files needed to build SoundCloud Desktop as a Flatpak package.

## Quick Start

### Prerequisites

```bash
# Install flatpak-builder
sudo apt install flatpak-builder  # Debian/Ubuntu
sudo dnf install flatpak-builder  # Fedora
```

### Generate dependency sources

Before building, you need to generate the `generated-sources.json` file that contains all npm dependencies:

```bash
# Clone flatpak-builder-tools
git clone https://github.com/flatpak/flatpak-builder-tools.git

# Generate sources from pnpm-lock.yaml
cd flatpak-builder-tools/node
./flatpak-node-generator.py pnpm ../../pnpm-lock.yaml -o ../../generated-sources.json
```

### Build locally

```bash
# Install required runtimes
flatpak install flathub org.freedesktop.Platform//23.08 org.freedesktop.Sdk//23.08
flatpak install flathub org.electronjs.Electron2.BaseApp//23.08

# Build the application
flatpak-builder --force-clean build-dir com.github.zxcnoname666.SoundCloudDesktop.json

# Install and run
flatpak-builder --user --install --force-clean build-dir com.github.zxcnoname666.SoundCloudDesktop.json
flatpak run com.github.zxcnoname666.SoundCloudDesktop
```

### Test the build

```bash
# Run from the build directory
flatpak-builder --run build-dir com.github.zxcnoname666.SoundCloudDesktop.json soundcloud
```

## Files Description

- `com.github.zxcnoname666.SoundCloudDesktop.json` - Main Flatpak manifest
- `com.github.zxcnoname666.SoundCloudDesktop.desktop` - Desktop entry file
- `com.github.zxcnoname666.SoundCloudDesktop.metainfo.xml` - AppStream metadata
- `soundcloud-wrapper.sh` - Wrapper script to launch the app
- `generated-sources.json` - Generated npm dependencies (needs to be created)

## Publishing to Flathub

To publish this app on Flathub:

1. Fork the flathub repository: https://github.com/flathub/flathub
2. Create a new repository: `flathub/com.github.zxcnoname666.SoundCloudDesktop`
3. Add all flatpak files to the new repository
4. Submit a pull request to the main flathub repository
5. Follow the review process at: https://github.com/flathub/flathub/wiki/App-Submission

## Architecture Support

Currently configured for:
- x86_64 (64-bit Intel/AMD)
- aarch64 (64-bit ARM)

## Permissions

The app requests the following permissions:
- Network access (required for streaming)
- Audio output (PulseAudio)
- X11 and Wayland display
- GPU acceleration
- Music and Downloads folder access
- Persistent config storage
- MPRIS media player integration
- Desktop notifications

## Troubleshooting

### Build fails with "network not available"

Make sure you generated `generated-sources.json` with all dependencies.

### App doesn't start

Check logs:
```bash
flatpak run --command=sh com.github.zxcnoname666.SoundCloudDesktop
journalctl --user -f | grep soundcloud
```

### Permission issues

Override permissions:
```bash
flatpak override --user --filesystem=home com.github.zxcnoname666.SoundCloudDesktop
```

## Additional Resources

- [Flatpak Documentation](https://docs.flatpak.org/)
- [Electron BaseApp](https://github.com/flathub/org.electronjs.Electron2.BaseApp)
- [Flatpak Builder Tools](https://github.com/flatpak/flatpak-builder-tools)
