#!/bin/sh
# Blender for the "blender" MCP server in .mcp.json (AENR-827). Development tooling only —
# nothing here ships in the app. Idempotent: run it at the start of a session, then the
# MCP server (uvx mcp-for-blender) talks to Blender on localhost:$BLENDER_PORT.
#
# 1. Finds Blender: $BLENDER_BIN, macOS /Applications/Blender.app, or the portable Linux
#    build in the cache dir — downloaded and extracted there on first use (≈380 MB, never
#    inside the repo).
# 2. Installs the MCP for Blender addon (the version pinned in .mcp.json) into the cache's
#    own scripts folder — your Blender preferences are left alone.
# 3. Starts Blender with the addon enabled and its socket server listening, in the
#    background: under xvfb-run on a headless Linux box (the cloud container), plainly elsewhere.
#    Telemetry stays off (the addon's consent defaults to off; the server gets DISABLE_TELEMETRY).
#
#   tools/mcp/blender.sh          start (or confirm it is already running)
#   tools/mcp/blender.sh stop     stop the Blender this script started
set -eu

VER=5.2.2
SERIES=5.2
ADDON_PKG=mcp-for-blender@2.2.1
PORT="${BLENDER_PORT:-9876}"
CACHE="${BLENDER_CACHE:-${XDG_CACHE_HOME:-$HOME/.cache}/slaice-blender}"
SCRIPTS="$CACHE/scripts"
PIDFILE="$CACHE/blender.pid"
LOG="$CACHE/blender.log"
mkdir -p "$CACHE"

listening() {
  python3 -c "import socket,sys; s=socket.socket(); s.settimeout(1); sys.exit(0 if s.connect_ex(('127.0.0.1', $PORT)) == 0 else 1)"
}

if [ "${1:-}" = "stop" ]; then
  if [ -f "$PIDFILE" ] && kill -- "-$(cat "$PIDFILE")" 2>/dev/null; then echo "Blender stopped."; else echo "No Blender started by this script is running."; fi
  rm -f "$PIDFILE"
  exit 0
fi

if listening; then
  echo "Blender MCP is already listening on localhost:$PORT."
  exit 0
fi

# ---- 1. Blender ----
BIN="${BLENDER_BIN:-}"
if [ -z "$BIN" ] && [ -x /Applications/Blender.app/Contents/MacOS/Blender ]; then
  BIN=/Applications/Blender.app/Contents/MacOS/Blender
fi
if [ -z "$BIN" ]; then
  BIN="$CACHE/blender-$VER-linux-x64/blender"
  if [ ! -x "$BIN" ]; then
    echo "Downloading Blender $VER (portable, Linux x64) into $CACHE…"
    curl -fL --retry 3 -o "$CACHE/blender.tar.xz" \
      "https://download.blender.org/release/Blender$SERIES/blender-$VER-linux-x64.tar.xz"
    tar -xJf "$CACHE/blender.tar.xz" -C "$CACHE"
    rm -f "$CACHE/blender.tar.xz"
  fi
fi

# ---- 2. The addon, into the cache's own scripts folder ----
if [ ! -f "$SCRIPTS/addons/blender_mcp.py" ]; then
  DISABLE_TELEMETRY=true uvx "$ADDON_PKG" install-addon --addons-dir "$SCRIPTS/addons"
fi
cat > "$CACHE/enable_addon.py" <<'PY'
import addon_utils
addon_utils.enable("blender_mcp", default_set=True)
print("MCP for Blender addon enabled")
PY

# ---- 3. Start it in the background ----
export BLENDER_USER_SCRIPTS="$SCRIPTS"
export DISABLE_TELEMETRY=true
HEADLESS=""
if [ "$(uname)" = "Linux" ] && [ -z "${DISPLAY:-}" ]; then
  command -v xvfb-run >/dev/null || { echo "xvfb-run is missing (apt-get install xvfb)" >&2; exit 1; }
  HEADLESS=1
fi
# Its own session, so "stop" can end Blender together with Xvfb.
if [ -n "$HEADLESS" ]; then
  setsid nohup xvfb-run -a -s "-screen 0 1280x720x24" "$BIN" --factory-startup --python "$CACHE/enable_addon.py" >"$LOG" 2>&1 &
else
  setsid nohup "$BIN" --factory-startup --python "$CACHE/enable_addon.py" >"$LOG" 2>&1 &
fi
echo $! >"$PIDFILE"

i=0
until listening; do
  i=$((i + 1))
  if [ "$i" -gt 60 ]; then
    echo "Blender did not open localhost:$PORT within 60 s — see $LOG" >&2
    exit 1
  fi
  sleep 1
done
echo "Blender $VER is running with the MCP addon on localhost:$PORT (log: $LOG)."
