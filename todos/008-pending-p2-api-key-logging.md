# API Key Partially Logged

---

status: pending
priority: p2
issue_id: 008
tags: [code-review, security, cliproxy-integration]
dependencies: []

---

## Problem Statement

The server logs the first 20 characters of `ANTHROPIC_API_KEY`, which exposes significant portion of the key.

## Findings

**Source:** Security Sentinel

**Location:** `apps/server/src/routes/app-spec/common.ts` (lines 70-72)

## Proposed Solution

Reduce logged characters or mask entirely:

```typescript
hasApiKey ? 'SET (sk-ant-******...)' : 'NOT SET';
```

## Acceptance Criteria

- [ ] API key logging shows at most 10 characters
- [ ] Or use masking pattern that doesn't reveal key structure
