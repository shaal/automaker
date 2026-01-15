#!/bin/bash
# Start AutoMaker with CLIProxyAPI for Claude Code subscription
#
# This script:
# 1. Starts CLIProxyAPI if not already running
# 2. Starts AutoMaker in web or electron mode
#
# Usage: ./start-with-proxy.sh [web|electron]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_PROXY_DIR="$HOME/code/utilities/CLIProxyAPI"
CLI_PROXY_CONFIG="$HOME/.cli-proxy-api/config.yaml"
PORT=8318

# Track if we started the proxy (to know if we should clean it up)
PROXY_PID=""
PROXY_STARTED_BY_US=false

# Cleanup function - kills proxy if we started it
cleanup() {
    if [ "$PROXY_STARTED_BY_US" = true ] && [ -n "$PROXY_PID" ]; then
        echo ""
        echo "Shutting down CLIProxyAPI (PID: $PROXY_PID)..."
        kill "$PROXY_PID" 2>/dev/null || true
    fi
}

# Set trap to cleanup on exit, interrupt, or termination
trap cleanup EXIT INT TERM

# Check if CLIProxyAPI is running (cross-platform: macOS and Linux)
check_proxy() {
    # macOS: use lsof
    if command -v lsof &>/dev/null; then
        lsof -i ":$PORT" -sTCP:LISTEN &>/dev/null && return 0
    fi
    # Linux: use ss or netstat
    ss -tlnp 2>/dev/null | grep -q ":$PORT" && return 0
    netstat -tlnp 2>/dev/null | grep -q ":$PORT" && return 0
    return 1
}

# Start CLIProxyAPI if needed
start_proxy() {
    if check_proxy; then
        echo "CLIProxyAPI is already running on port $PORT"
    else
        echo "Starting CLIProxyAPI..."
        cd "$CLI_PROXY_DIR"
        nohup ./cli-proxy-api --config "$CLI_PROXY_CONFIG" > /tmp/cliproxyapi.log 2>&1 &
        PROXY_PID=$!
        PROXY_STARTED_BY_US=true

        # Wait for it to start
        for i in {1..10}; do
            sleep 1
            if check_proxy; then
                echo "CLIProxyAPI started successfully on port $PORT (PID: $PROXY_PID)"
                return 0
            fi
        done

        echo "ERROR: Failed to start CLIProxyAPI"
        cat /tmp/cliproxyapi.log
        exit 1
    fi
}

# Main
echo "=== AutoMaker + CLIProxyAPI Starter ==="
echo ""

# Start proxy
start_proxy

# Start AutoMaker
cd "$SCRIPT_DIR"
MODE="${1:-web}"

# Export simple API key for web login (must be set before npm starts)
export AUTOMAKER_API_KEY="${AUTOMAKER_API_KEY:-dev}"

# Configure Claude SDK to use CLIProxyAPI
export ANTHROPIC_BASE_URL="http://127.0.0.1:$PORT"
# Use proxy-managed key - the proxy handles actual authentication via Claude Code subscription
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-proxy-managed}"

echo ""
echo "Starting AutoMaker in $MODE mode..."
echo "Using CLIProxyAPI at http://127.0.0.1:$PORT"
echo "Web login key: $AUTOMAKER_API_KEY"
echo ""

case "$MODE" in
    web)
        # Web mode requires running both the backend server and frontend
        # dev:full starts them concurrently using concurrently package
        npm run dev:full
        ;;
    electron)
        npm run dev:electron
        ;;
    *)
        echo "Usage: $0 [web|electron]"
        exit 1
        ;;
esac
