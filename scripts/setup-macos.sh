#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This setup helper is intended for macOS."
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install it from https://brew.sh and run this command again."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Installing Node.js with Homebrew…"
  brew install node
fi

node_major="$(node -p "process.versions.node.split('.')[0]")"
if (( node_major < 20 )); then
  echo "Node.js 20 or newer is required. Upgrade with: brew upgrade node"
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Installing FFmpeg with Homebrew…"
  brew install ffmpeg
fi

echo "Installing locked Node dependencies…"
npm ci
npm run check:ffmpeg
npm run build

echo
echo "Setup complete. Start the studio with:"
echo "  npm start"
echo
echo "Then open http://127.0.0.1:4178"
