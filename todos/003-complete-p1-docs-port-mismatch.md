# Documentation Port Mismatch

---

status: complete
priority: p1
issue_id: 003
tags: [code-review, documentation, cliproxy-integration]
dependencies: []

---

## Problem Statement

The documentation (`docs/cli-proxy-setup.md`) consistently references port 8317, but the startup script (`start-with-proxy.sh`) uses port 8318. Users following the documentation will have AutoMaker unable to connect to CLIProxyAPI.

**Why it matters:** Configuration mismatches cause silent failures that are difficult to debug. Users expect documentation to match actual behavior.

## Findings

**Source:** Code Quality Reviewer

**Evidence:**

- `start-with-proxy.sh` line 15: `PORT=8318`
- `docs/cli-proxy-setup.md` line 12: `(port 8317)`
- `docs/cli-proxy-setup.md` line 58: `port: 8317`
- `docs/cli-proxy-setup.md` line 82: `ANTHROPIC_BASE_URL=http://127.0.0.1:8317`

## Proposed Solutions

### Solution 1: Update documentation to use 8318 (Recommended)

Change all references from 8317 to 8318 in the documentation.

**Pros:** Matches working configuration, minimal changes
**Cons:** None
**Effort:** Small (search and replace)
**Risk:** None

### Solution 2: Update script to use 8317

Change script to match documentation.

**Pros:** Preserves documented behavior
**Cons:** Requires retesting, may break existing setups
**Effort:** Small
**Risk:** Medium (may break existing configs)

## Recommended Action

Implement Solution 1 - Update documentation to match script (8318)

## Acceptance Criteria

- [ ] All port references in docs/cli-proxy-setup.md use 8318
- [ ] Architecture diagram shows correct port
- [ ] Example config.yaml shows port: 8318
- [ ] Example .env shows correct ANTHROPIC_BASE_URL

## Work Log

| Date       | Action                    | Outcome            |
| ---------- | ------------------------- | ------------------ |
| 2026-01-15 | Identified in code review | Finding documented |

## Resources

- PR: feature/cliproxy-integration
- Files: docs/cli-proxy-setup.md, start-with-proxy.sh
