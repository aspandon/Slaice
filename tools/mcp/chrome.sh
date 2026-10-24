#!/bin/sh
# Chrome launcher for the browser MCP servers in .mcp.json (Chrome DevTools,
# Playwright, a11y, Lighthouse). Development tooling only — not part of the app.
#
# Picks the first browser found: $CHROME_BIN, the cloud container's pre-installed
# Chromium, macOS Google Chrome, then Chrome/Chromium on the PATH. Chrome refuses
# to start as root with its sandbox on (cloud containers run as root), so the
# sandbox is turned off only in that case.
for c in "$CHROME_BIN" /opt/pw-browsers/chromium \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "$(command -v google-chrome 2>/dev/null)" "$(command -v chromium 2>/dev/null)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then
    if [ "$(id -u)" = "0" ]; then exec "$c" --no-sandbox "$@"; fi
    exec "$c" "$@"
  fi
done
echo "tools/mcp/chrome.sh: no Chrome or Chromium found; set CHROME_BIN" >&2
exit 1
