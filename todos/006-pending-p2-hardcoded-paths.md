# Hardcoded Paths Not Configurable

---

status: pending
priority: p2
issue_id: 006
tags: [code-review, devops, cliproxy-integration]
dependencies: []

---

## Problem Statement

The script has hardcoded paths that won't work across different environments:

```bash
CLI_PROXY_DIR="$HOME/code/utilities/CLIProxyAPI"
```

## Proposed Solution

Make paths configurable via environment variables:

```bash
CLI_PROXY_DIR="${CLI_PROXY_DIR:-$HOME/code/utilities/CLIProxyAPI}"
CLI_PROXY_CONFIG="${CLI_PROXY_CONFIG:-$HOME/.cli-proxy-api/config.yaml}"
```

## Acceptance Criteria

- [ ] CLI_PROXY_DIR configurable via environment
- [ ] CLI_PROXY_CONFIG configurable via environment
- [ ] Defaults preserved for backward compatibility
