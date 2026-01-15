# Using AutoMaker with CLIProxyAPI

This guide explains how to use AutoMaker with [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) to leverage your Claude Code subscription instead of requiring a separate Anthropic API key.

## Overview

CLIProxyAPI is a proxy server that provides Claude-compatible API endpoints using your existing Claude Code CLI OAuth credentials. This allows AutoMaker to use your Claude Code subscription for AI agent operations.

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│  AutoMaker  │ ───▶ │ CLIProxyAPI  │ ───▶ │ Anthropic API   │
│  (port 3007)│      │ (port 8318)  │      │ (via OAuth)     │
└─────────────┘      └──────────────┘      └─────────────────┘
                            │
                            ▼
                     ~/.cli-proxy-api/
                     claude-*.json (OAuth tokens)
```

## Prerequisites

- **Node.js 18+** (for AutoMaker)
- **Claude Code CLI** installed and authenticated (`claude` command)
- **CLIProxyAPI** binary ([download from releases](https://github.com/router-for-me/CLIProxyAPI/releases))

## Setup Instructions

### 1. Install CLIProxyAPI

```bash
# Clone or download CLIProxyAPI
cd ~/code/utilities
git clone https://github.com/router-for-me/CLIProxyAPI.git
cd CLIProxyAPI

# Or download the binary directly from releases
```

### 2. Authenticate Claude Code

If you haven't already authenticated Claude Code CLI:

```bash
# Run Claude Code login
cd ~/code/utilities/CLIProxyAPI
./cli-proxy-api --claude-login
```

This creates an OAuth token file at `~/.cli-proxy-api/claude-<email>.json`.

### 3. Configure CLIProxyAPI

Create or edit `~/.cli-proxy-api/config.yaml`:

```yaml
# CLIProxyAPI Configuration
host: '127.0.0.1' # localhost only for security
port: 8318

# Authentication directory (where OAuth tokens are stored)
auth-dir: '~/.cli-proxy-api'

# API keys for client authentication
api-keys:
  - 'cliproxyapi' # Used by AutoMaker

# Optional settings
debug: false
usage-statistics-enabled: false
request-retry: 3
max-retry-interval: 30
```

### 4. Configure AutoMaker

Create `.env` in the AutoMaker root directory:

```bash
# AutoMaker Configuration for CLIProxyAPI

# Point to CLIProxyAPI server
ANTHROPIC_BASE_URL=http://127.0.0.1:8318

# API key configured in CLIProxyAPI config.yaml
ANTHROPIC_API_KEY=cliproxyapi

# Server Configuration
PORT=3008
DATA_DIR=./data
CORS_ORIGIN=http://localhost:3007
```

### 5. Start the Services

**Option A: Use the startup script**

```bash
cd ~/code/utilities/automaker
./start-with-proxy.sh web      # Browser mode
./start-with-proxy.sh electron # Desktop app
```

**Option B: Start manually**

```bash
# Terminal 1: Start CLIProxyAPI
cd ~/code/utilities/CLIProxyAPI
./cli-proxy-api --config ~/.cli-proxy-api/config.yaml

# Terminal 2: Start AutoMaker
cd ~/code/utilities/automaker
npm run dev:web
```

### 6. Access AutoMaker

Open http://localhost:3007 in your browser. AutoMaker will now use your Claude Code subscription through CLIProxyAPI.

## Verification

Test that CLIProxyAPI is working:

```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: cliproxyapi" \
  -d '{"model": "claude-sonnet-4-20250514", "max_tokens": 50, "messages": [{"role": "user", "content": "Hello"}]}' \
  http://127.0.0.1:8318/v1/messages
```

You should receive a response from Claude.

## Troubleshooting

### CLIProxyAPI not starting

Check if the port is already in use:

```bash
ss -tlnp | grep 8318
```

Check the logs:

```bash
cat /tmp/cliproxyapi.log
```

### Authentication errors

Verify your OAuth token exists:

```bash
ls ~/.cli-proxy-api/*.json
```

Re-authenticate if needed:

```bash
./cli-proxy-api --claude-login
```

### AutoMaker not connecting

Verify the environment variables are loaded:

```bash
grep ANTHROPIC ~/code/utilities/automaker/.env
```

Ensure CLIProxyAPI is running before starting AutoMaker.

## Security Notes

- CLIProxyAPI binds to `127.0.0.1` by default (localhost only)
- OAuth tokens are stored in `~/.cli-proxy-api/` with restricted permissions
- The `api-keys` in config.yaml provide an additional authentication layer

## Related Links

- [CLIProxyAPI Documentation](https://help.router-for.me/)
- [CLIProxyAPI GitHub](https://github.com/router-for-me/CLIProxyAPI)
- [Claude Code CLI](https://claude.ai/code)
