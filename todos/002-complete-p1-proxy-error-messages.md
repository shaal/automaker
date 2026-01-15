# Proxy-Aware Error Messages

---

status: complete
priority: p1
issue_id: 002
tags: [code-review, architecture, cliproxy-integration, ux]
dependencies: []

---

## Problem Statement

When CLIProxyAPI fails or is unreachable, users get generic API errors with no indication the proxy is the problem. Error messages like "API request failed" don't help users understand that the proxy service needs attention.

**Why it matters:** Poor debugging experience leads to frustrated users and increased support burden. Users waste time investigating API issues when the actual problem is proxy connectivity.

## Findings

**Source:** Architecture Strategist

**Evidence:**

- `claude-provider.ts` uses generic `classifyError()` with no proxy awareness
- No special handling for `ECONNREFUSED`, `ETIMEDOUT`, or `502 Bad Gateway`
- Error messages don't mention proxy configuration

**Failure Scenario:**

1. User starts AutoMaker with proxy configured
2. CLIProxyAPI crashes or stops responding
3. AutoMaker makes API request
4. Request times out or fails
5. User sees: "API request failed" (no mention of proxy)

## Proposed Solutions

### Solution 1: Add proxy-aware error classification (Recommended)

Add a helper function to detect and enhance proxy-related errors:

```typescript
function enhanceProxyError(error: Error): string {
  const baseUrl = process.env.ANTHROPIC_BASE_URL;

  if (!baseUrl || baseUrl.includes('api.anthropic.com')) {
    return error.message; // Not using proxy
  }

  if (error.message.includes('ECONNREFUSED')) {
    return `Cannot connect to CLIProxyAPI at ${baseUrl}. Is CLIProxyAPI running?`;
  }

  if (error.message.includes('ETIMEDOUT')) {
    return `CLIProxyAPI at ${baseUrl} is not responding. Check proxy service.`;
  }

  return `Proxy error (${baseUrl}): ${error.message}`;
}
```

**Pros:** Clear error messages, easy to implement, helps users self-diagnose
**Cons:** Requires modification to error handling path
**Effort:** Small-Medium
**Risk:** Low

### Solution 2: Add proxy health check on startup

Check proxy connectivity during server startup and warn users.

**Pros:** Catches issues early
**Cons:** Additional startup latency
**Effort:** Medium
**Risk:** Low

### Solution 3: Document troubleshooting in docs (Selected)

Add troubleshooting section to `docs/cli-proxy-setup.md` explaining how to identify proxy issues from generic errors.

**Pros:** No code changes to core files, maintains fork cleanliness
**Cons:** Slightly worse UX (users must read docs)
**Effort:** Small
**Risk:** None

## Recommended Action

~~Implement Solution 1, consider Solution 2 as follow-up~~

**Updated:** Implement Solution 3 (documentation-only) to maintain fork cleanliness per issue #009. The fork should not modify core AutoMaker files.

## Acceptance Criteria

- [x] Troubleshooting section added to docs/cli-proxy-setup.md
- [x] Common error patterns documented (ECONNREFUSED, ETIMEDOUT, 502)
- [x] Users can identify proxy vs API issues via documentation
- [x] No changes to core AutoMaker files (fork maintainability)

## Work Log

| Date       | Action                                         | Outcome                  |
| ---------- | ---------------------------------------------- | ------------------------ |
| 2026-01-15 | Identified in code review                      | Finding documented       |
| 2026-01-15 | Initially implemented in claude-provider.ts    | Code changes made        |
| 2026-01-15 | Reverted per issue #009 (fork maintainability) | Chose Solution 3 instead |
| 2026-01-15 | Added troubleshooting to docs                  | Documentation approach   |

## Resources

- PR: feature/cliproxy-integration
- File: apps/server/src/providers/claude-provider.ts
