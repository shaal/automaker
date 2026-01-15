# Process Cleanup on Exit

---

status: pending
priority: p1
issue_id: 001
tags: [code-review, devops, cliproxy-integration]
dependencies: []

---

## Problem Statement

The `start-with-proxy.sh` script uses `nohup` to daemonize CLIProxyAPI but provides no cleanup mechanism. When the user terminates the script (Ctrl+C), the CLIProxyAPI process becomes orphaned and continues running indefinitely.

**Why it matters:** Orphaned processes accumulate over multiple runs, causing port conflicts on subsequent startups, resource leaks, and unclear system state.

## Findings

**Source:** DevOps Harmony Analyst, Code Quality Reviewer

**Evidence:**

- Line 36: `nohup ./cli-proxy-api --config "$CLI_PROXY_CONFIG" > /tmp/cliproxyapi.log 2>&1 &`
- No trap handler for INT/TERM signals
- No cleanup function defined

## Proposed Solutions

### Solution 1: Add trap-based cleanup (Recommended)

```bash
PROXY_PID=""

cleanup() {
    if [ -n "$PROXY_PID" ]; then
        echo "Shutting down CLIProxyAPI (PID: $PROXY_PID)..."
        kill "$PROXY_PID" 2>/dev/null || true
    fi
}

trap cleanup EXIT INT TERM
```

**Pros:** Simple, standard approach, handles all exit scenarios
**Cons:** None significant
**Effort:** Small (5-10 lines)
**Risk:** Low

### Solution 2: Use process group management

**Pros:** More comprehensive process tree cleanup
**Cons:** More complex, may kill unintended processes
**Effort:** Medium
**Risk:** Medium

## Recommended Action

Implement Solution 1 - Add trap-based cleanup

## Acceptance Criteria

- [ ] Script captures CLIProxyAPI PID after starting
- [ ] Trap handler defined for EXIT, INT, TERM signals
- [ ] Cleanup function kills proxy process gracefully
- [ ] No orphaned processes after Ctrl+C

## Work Log

| Date       | Action                    | Outcome            |
| ---------- | ------------------------- | ------------------ |
| 2026-01-15 | Identified in code review | Finding documented |

## Resources

- PR: feature/cliproxy-integration
- File: start-with-proxy.sh
