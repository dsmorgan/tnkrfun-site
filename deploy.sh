#!/usr/bin/env bash
# Deploy tnkrfun-site on a podman host.
# Pulls latest from tnkrfun-site + all game submodules, then restarts the container.

set -euo pipefail

cd "$(dirname "$0")"

echo "==> Pulling tnkrfun-site..."
git pull --ff-only

echo "==> Updating game submodules (always latest from each game's main)..."
git submodule update --init --recursive --remote

echo "==> Recreating container..."
podman compose up -d --force-recreate

echo "==> Done. Serving on port 8025."
