# Insecure Log File Location

---

status: pending
priority: p2
issue_id: 004
tags: [code-review, security, cliproxy-integration]
dependencies: []

---

## Problem Statement

CLIProxyAPI logs are written to `/tmp/cliproxyapi.log`, which is world-readable on most Unix systems. Logs may contain OAuth tokens, API requests, or debugging information that could be exposed to other users on shared systems.

## Findings

**Source:** Security Sentinel, DevOps Analyst

**Evidence:**

- Line 36: `nohup ./cli-proxy-api --config "$CLI_PROXY_CONFIG" > /tmp/cliproxyapi.log 2>&1 &`

## Proposed Solution

Move logs to user-specific directory with restricted permissions:

```bash
LOG_DIR="$HOME/.automaker/logs"
mkdir -p "$LOG_DIR"
chmod 700 "$LOG_DIR"
LOG_FILE="$LOG_DIR/cliproxyapi.log"
```

## Acceptance Criteria

- [ ] Logs written to ~/.automaker/logs/ or similar
- [ ] Directory created with 700 permissions
- [ ] Log file created with 600 permissions
