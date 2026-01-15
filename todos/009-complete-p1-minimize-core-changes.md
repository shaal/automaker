# Minimize Core File Changes for Fork Maintainability

---

status: complete
priority: p1
issue_id: 009
tags: [code-review, architecture, cliproxy-integration, fork-maintenance]
dependencies: []

---

## Problem Statement

The CLIProxy integration should NOT modify core AutoMaker files like `claude-provider.ts`. The fork's goal is to add CLIProxyAPI support **on top** of the original codebase without changing it, so upstream updates can be pulled without merge conflicts.

**Current Issue:** The proxy-aware error handling was added directly to `apps/server/src/providers/claude-provider.ts`, which is a core file that will conflict when merging upstream/main.

**Why it matters:** Every change to core files creates merge conflicts when syncing with upstream. The fork should be a thin layer that only adds new files or uses extension points.

## Findings

**Source:** User requirement for fork maintainability

**Files incorrectly modified:**

- `apps/server/src/providers/claude-provider.ts` - Added `isUsingProxy()` and `enhanceProxyError()` functions

**Files that ARE safe to modify (fork-only):**

- `start-with-proxy.sh` - New file, fork-only
- `docs/cli-proxy-setup.md` - New file, fork-only
- Any new files in a `fork/` or `cliproxy/` directory

## Proposed Solutions

### Solution 1: Revert claude-provider.ts changes, use wrapper/middleware (Recommended)

1. Revert the changes to `claude-provider.ts` to match upstream
2. Create a new file `apps/server/src/middleware/proxy-error-handler.ts` that:
   - Wraps error responses at the Express middleware level
   - Intercepts errors and enhances them if using proxy
   - Doesn't touch the provider code at all

```typescript
// apps/server/src/middleware/proxy-error-handler.ts
export function proxyErrorMiddleware(err, req, res, next) {
  if (isUsingProxy() && isConnectionError(err)) {
    err.message = enhanceProxyError(err);
  }
  next(err);
}
```

**Pros:** Zero changes to core files, clean separation
**Cons:** Slightly more complex architecture
**Effort:** Medium
**Risk:** Low

### Solution 2: Accept merge conflicts, document resolution

Keep the changes and document how to resolve conflicts when merging upstream.

**Pros:** Simpler immediate solution
**Cons:** Ongoing maintenance burden, conflicts on every upstream sync
**Effort:** Low initially, high ongoing
**Risk:** High - easy to mess up merges

### Solution 3: Use environment-based error messages only

Remove the code changes entirely. Instead, just document that proxy errors will show generic messages and users should check proxy logs.

**Pros:** No code changes at all
**Cons:** Worse user experience when proxy fails
**Effort:** Low
**Risk:** None

## Recommended Action

Implement Solution 1:

1. `git checkout upstream/main -- apps/server/src/providers/claude-provider.ts`
2. Create new middleware file for proxy error handling
3. Register middleware in Express app (if extension point exists)
4. If no extension point, consider Solution 3 for now

## Acceptance Criteria

- [x] `claude-provider.ts` matches upstream/main exactly
- [x] No merge conflicts when running `git merge upstream/main`
- [x] Proxy error handling documented in docs/cli-proxy-setup.md (workaround approach)
- [x] Fork changes are isolated to new files only

## Work Log

| Date       | Action                                        | Outcome                                                                      |
| ---------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| 2026-01-15 | Identified need for minimal fork              | Todo created                                                                 |
| 2026-01-15 | Reverted claude-provider.ts to match upstream | `git checkout upstream/main -- apps/server/src/providers/claude-provider.ts` |
| 2026-01-15 | Chose Solution 3 (document workaround)        | Zero code changes to core files                                              |

## Resources

- PR: feature/cliproxy-integration
- Upstream: https://github.com/AutoMaker-Org/automaker
- Goal: Keep fork synced with upstream without conflicts
