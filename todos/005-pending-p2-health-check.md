# Health Check Beyond Port Binding

---

status: pending
priority: p2
issue_id: 005
tags: [code-review, devops, cliproxy-integration]
dependencies: []

---

## Problem Statement

The `check_proxy()` function only verifies port binding, not actual API health. A process could bind the port but fail to authenticate, have expired OAuth tokens, or be in a crash loop.

## Findings

**Source:** DevOps Analyst

**Evidence:**

- Logs show 401 errors despite port being bound
- No HTTP health check endpoint validation

## Proposed Solution

Add HTTP-based health validation:

```bash
check_proxy_health() {
    check_proxy || return 1
    curl -sf "http://127.0.0.1:$PORT/v1/models" -H "x-api-key: proxy-managed" &>/dev/null
}
```

## Acceptance Criteria

- [ ] Health check validates API responds (not just port)
- [ ] Clear error message if port bound but API unhealthy
