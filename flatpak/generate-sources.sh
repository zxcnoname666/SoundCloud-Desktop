#!/bin/bash
# Script to generate Flatpak dependency sources from pnpm-lock.yaml

set -e

echo "Generating Flatpak sources from pnpm-lock.yaml..."

# Check if flatpak-builder-tools exists
if [ ! -d "flatpak-builder-tools" ]; then
    echo "Cloning flatpak-builder-tools..."
    git clone https://github.com/flatpak/flatpak-builder-tools.git
fi

# Generate sources
echo "Running flatpak-node-generator..."
cd flatpak-builder-tools/node

# Use python3 to run the generator
python3 flatpak-node-generator.py pnpm ../../pnpm-lock.yaml -o ../generated-sources.json

echo "✓ Generated generated-sources.json"
echo ""
echo "You can now build with:"
echo "  flatpak-builder --force-clean build-dir com.github.zxcnoname666.SoundCloudDesktop.json"
