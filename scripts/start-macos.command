#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -d node_modules || ! -d dist ]]; then
  npm run setup:mac
fi

(sleep 1; open "http://127.0.0.1:4178") &
npm start
