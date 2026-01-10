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
PORT=8317

# Check if CLIProxyAPI is running
check_proxy() {
    ss -tlnp 2>/dev/null | grep -q ":$PORT" || netstat -tlnp 2>/dev/null | grep -q ":$PORT"
}

# Start CLIProxyAPI if needed
start_proxy() {
    if check_proxy; then
        echo "CLIProxyAPI is already running on port $PORT"
    else
        echo "Starting CLIProxyAPI..."
        cd "$CLI_PROXY_DIR"
        nohup ./cli-proxy-api --config "$CLI_PROXY_CONFIG" > /tmp/cliproxyapi.log 2>&1 &

        # Wait for it to start
        for i in {1..10}; do
            sleep 1
            if check_proxy; then
                echo "CLIProxyAPI started successfully on port $PORT"
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

echo ""
echo "Starting AutoMaker in $MODE mode..."
echo "Using CLIProxyAPI at http://127.0.0.1:$PORT"
echo ""

case "$MODE" in
    web)
        npm run dev:web
        ;;
    electron)
        npm run dev:electron
        ;;
    *)
        echo "Usage: $0 [web|electron]"
        exit 1
        ;;
esac
