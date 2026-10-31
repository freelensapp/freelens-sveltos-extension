#!/usr/bin/env bash
# Builds, packs and installs the extension into the local Freelens.
# Freelens watches ~/.freelens/extensions and picks up the change without a restart.
set -euo pipefail

cd "$(dirname "$0")/.."

pnpm pack:dev

tgz=$(ls -t ./*.tgz | head -n 1)
dest="${FREELENS_EXTENSIONS_DIR:-$HOME/.freelens/extensions}/freelensapp--sveltos-extension"

rm -rf "$dest" "$dest.tmp"
mkdir -p "$dest.tmp"
tar -xzf "$tgz" -C "$dest.tmp" --strip-components=1
# Move in one step so Freelens does not see a half-written package.json.
mv "$dest.tmp" "$dest"

echo "Installed $tgz into $dest"
