# Proxy-Aware Error Messages

---

status: pending
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

## Recommended Action

Implement Solution 1, consider Solution 2 as follow-up

## Acceptance Criteria

- [ ] ECONNREFUSED errors mention CLIProxyAPI specifically
- [ ] ETIMEDOUT errors suggest checking proxy service
- [ ] Error messages include proxy URL for debugging
- [ ] Users can identify proxy vs API issues from error message

## Work Log

| Date       | Action                    | Outcome            |
| ---------- | ------------------------- | ------------------ |
| 2026-01-15 | Identified in code review | Finding documented |

## Resources

- PR: feature/cliproxy-integration
- File: apps/server/src/providers/claude-provider.ts
