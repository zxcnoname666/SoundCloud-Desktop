#!/bin/bash
# Wrapper script for SoundCloud Desktop Flatpak

export TMPDIR="${XDG_RUNTIME_DIR}/app/${FLATPAK_ID}"
mkdir -p "${TMPDIR}"

# Set Electron flags for better Wayland support
export ELECTRON_OZONE_PLATFORM_HINT=auto

# Launch the application
exec zypak-wrapper /app/soundcloud/soundcloud "$@"
