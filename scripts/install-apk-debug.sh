#!/usr/bin/env bash
# Build web assets, assemble debug APK, and install on connected device.
# Usage: ./scripts/install-apk-debug.sh [--skip-build] [--skip-install]
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK="$ROOT_DIR/app/build/outputs/apk/debug/app-debug.apk"

SKIP_BUILD=0
SKIP_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    -h|--help)
      echo "Usage: $(basename "$0") [--skip-build] [--skip-install]"
      exit 0
      ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

cd "$ROOT_DIR"

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "==> Building web assets (vite)..."
  npm run build
  echo "==> Assembling debug APK..."
  ./gradlew assembleDebug
else
  echo "==> Skipping build."
fi

if [ "$SKIP_INSTALL" -eq 0 ]; then
  if [ ! -f "$APK" ]; then
    echo "APK not found at $APK" >&2
    echo "Run without --skip-build first." >&2
    exit 1
  fi
  echo "==> Detecting devices..."
  # Collect serials of all connected devices (state == device)
  mapfile -t DEVICES < <(adb devices | awk '$2 == "device" { print $1 }')
  if [ "${#DEVICES[@]}" -eq 0 ]; then
    echo "No devices connected (adb devices is empty)." >&2
    exit 1
  fi
  echo "==> Installing $APK on ${#DEVICES[@]} device(s): ${DEVICES[*]}"
  FAIL=0
  for serial in "${DEVICES[@]}"; do
    echo "----> [$serial] installing..."
    if adb -s "$serial" install -r "$APK"; then
      echo "----> [$serial] OK"
    else
      echo "----> [$serial] FAILED" >&2
      FAIL=1
    fi
  done
  if [ "$FAIL" -ne 0 ]; then
    echo "Install failed on at least one device." >&2
    exit 1
  fi
  echo "==> Done."
else
  echo "==> Skipping install. APK at: $APK"
fi
