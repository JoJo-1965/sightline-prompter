#!/bin/bash
set -euo pipefail
for image in dist/*.dmg; do
  mountpoint="$(mktemp -d)"
  hdiutil attach "$image" -readonly -nobrowse -mountpoint "$mountpoint"
  trap 'hdiutil detach "$mountpoint" || true' EXIT
  app="$mountpoint/Sightline Prompter.app"
  codesign --verify --deep --strict --verbose=2 "$app"
  signature="$(codesign --display --verbose=4 "$app" 2>&1)"
  printf '%s\n' "$signature"
  printf '%s\n' "$signature" | grep -q 'Signature=adhoc'
  # Exercise the packaged main process without opening a camera or user profile.
  ELECTRON_RUN_AS_NODE=1 "$app/Contents/MacOS/Sightline Prompter" -e 'console.log("Packaged Electron runtime:", process.version, process.arch)'
  hdiutil detach "$mountpoint"
  trap - EXIT
  rmdir "$mountpoint"
done
