# PRD to Automaker Features Guide

This guide helps Claude generate properly structured Automaker features from a Product Requirements Document (PRD). Use this in new projects to create feature folders that Automaker can execute.

## Quick Start

1. Place your PRD file in the project (e.g., `PRD.md` or `.automaker/context/PRD.md`)
2. Create `.automaker/features/` directory
3. Use this guide to generate `feature.json` files for each feature phase
4. Run features in Automaker sequentially or in parallel based on dependencies

---

## Feature JSON Schema

### Minimal Required Fields

```json
{
  "id": "feature-unique-identifier",
  "category": "Core",
  "title": "Feature Title",
  "description": "Detailed description of what needs to be implemented",
  "status": "backlog",
  "priority": 1,
  "imagePaths": [],
  "textFilePaths": []
}
```

### Complete Feature Schema

```json
{
  "id": "feature-unique-identifier",
  "category": "Core | UI/UX | AI Agent | Infrastructure | Testing | From GitHub",
  "title": "Short descriptive title",
  "description": "Detailed implementation description with requirements",
  "status": "backlog | pending | running | completed | failed | verified | waiting_approval",
  "priority": 1,
  "complexity": "simple | moderate | complex",
  "dependencies": ["feature-id-1", "feature-id-2"],
  "createdAt": "2026-01-23T00:00:00.000Z",
  "updatedAt": "2026-01-23T00:00:00.000Z",
  "branchName": null,
  "descriptionHistory": [],
  "skipTests": false,
  "model": "claude-sonnet | claude-opus | claude-haiku",
  "thinkingLevel": "none | low | medium | high | ultrathink",
  "reasoningEffort": "none | low | medium | high",
  "imagePaths": [],
  "textFilePaths": [],
  "planningMode": "none | spec | full",
  "requirePlanApproval": false,
  "workMode": "auto | custom"
}
```

---

## Field Descriptions

### Core Fields

| Field           | Type   | Required | Description                                                                       |
| --------------- | ------ | -------- | --------------------------------------------------------------------------------- |
| `id`            | string | Yes      | Unique identifier. Use format: `feature-{descriptive-name}` or `phase-{n}-{name}` |
| `category`      | string | Yes      | Grouping category for the feature                                                 |
| `title`         | string | Yes      | Short, descriptive title (3-8 words)                                              |
| `description`   | string | Yes      | Detailed implementation requirements                                              |
| `status`        | string | Yes      | Current state. **Must be `backlog` for Automaker to execute**                     |
| `priority`      | number | Yes      | Execution priority (1 = highest, higher numbers = lower priority)                 |
| `imagePaths`    | array  | Yes      | Must be empty `[]` - Automaker populates this automatically                       |
| `textFilePaths` | array  | Yes      | Must be empty `[]` - Automaker populates this automatically                       |

### Optional Fields

| Field                 | Type     | Default  | Description                                                                            |
| --------------------- | -------- | -------- | -------------------------------------------------------------------------------------- |
| `complexity`          | string   | moderate | `simple` (< 1 hour), `moderate` (1-4 hours), `complex` (> 4 hours)                     |
| `dependencies`        | string[] | []       | Array of feature IDs that must complete first                                          |
| `skipTests`           | boolean  | false    | Skip test execution during verification                                                |
| `model`               | string   | -        | AI model: `claude-sonnet` (balanced), `claude-opus` (complex), `claude-haiku` (simple) |
| `thinkingLevel`       | string   | none     | Extended thinking: `none`, `low`, `medium`, `high`, `ultrathink`                       |
| `planningMode`        | string   | none     | `none` (direct), `spec` (generate spec first), `full` (spec + tool exploration)        |
| `requirePlanApproval` | boolean  | false    | Pause for human approval before execution                                              |
| `workMode`            | string   | auto     | `auto` (continuous), `custom` (step-by-step)                                           |

---

## Writing Effective Descriptions

### Structure for Complex Features

```markdown
## Overview

Brief summary of what this feature accomplishes.

## Requirements

- Requirement 1: Specific implementation detail
- Requirement 2: Another specific detail
- Requirement 3: Edge case to handle

## Technical Approach

- Use existing pattern from X
- Modify files A, B, C
- Follow the Y architectural pattern

## Acceptance Criteria

- GIVEN condition, WHEN action, THEN expected result
- GIVEN another condition, WHEN action, THEN expected result

## Files to Modify

- `path/to/file1.ts` - Purpose
- `path/to/file2.tsx` - Purpose

## Edge Cases

- Handle empty state
- Handle error conditions
- Handle concurrent operations
```

### Structure for Simple Features

```markdown
Add [feature] to [location].

Requirements:

- Specific requirement 1
- Specific requirement 2

Files: `path/to/main/file.ts`
```

---

## Phasing Strategy

### When to Create Phases

Create separate features (phases) when:

1. Features have clear dependencies (Phase 2 needs Phase 1's types)
2. Different complexity levels (separate simple setup from complex logic)
3. Different areas of codebase (backend vs frontend)
4. Risk isolation (core changes separate from UI changes)

### Recommended Phase Structure

```
Phase 1: Foundation / Types / Schema
Phase 2: Backend / Service Layer
Phase 3: API Routes / Endpoints
Phase 4: Frontend / UI Components
Phase 5: Integration / Testing
Phase 6: Polish / Documentation
```

### Phase Naming Convention

```
phase-1-foundation
phase-2-backend-service
phase-3-api-routes
phase-4-frontend-ui
phase-5-integration
```

---

## Example: Converting PRD to Features

### Input PRD Section

```markdown
## User Authentication Feature

Users should be able to log in with email/password and OAuth providers.
The system should support session management and secure token storage.
```

### Output Feature Files

**Phase 1: Types and Schema**

```json
{
  "id": "phase-1-auth-types",
  "category": "Core",
  "title": "Authentication Types and Schema",
  "description": "Define TypeScript types and database schema for authentication.\n\nRequirements:\n- Add User, Session, and AuthToken types to @automaker/types\n- Create database migration for users and sessions tables\n- Define AuthProvider enum (email, google, github)\n\nFiles:\n- libs/types/src/auth.ts\n- libs/types/src/index.ts\n- apps/server/src/db/migrations/",
  "status": "backlog",
  "priority": 1,
  "complexity": "simple",
  "dependencies": [],
  "model": "claude-sonnet",
  "planningMode": "none"
}
```

**Phase 2: Backend Service**

```json
{
  "id": "phase-2-auth-service",
  "category": "Core",
  "title": "Authentication Service Layer",
  "description": "Implement authentication service with email/password and OAuth support.\n\nRequirements:\n- Create AuthService class with login, logout, register methods\n- Implement password hashing with bcrypt\n- Add OAuth provider integration (Google, GitHub)\n- Session management with secure token generation\n\nAcceptance Criteria:\n- GIVEN valid credentials, WHEN user logs in, THEN session token is returned\n- GIVEN invalid credentials, WHEN user logs in, THEN appropriate error is returned\n- GIVEN OAuth callback, WHEN user authenticates, THEN user is created/updated and session started\n\nFiles:\n- apps/server/src/services/auth-service.ts\n- apps/server/src/services/oauth-service.ts\n- apps/server/src/lib/password.ts",
  "status": "backlog",
  "priority": 1,
  "complexity": "complex",
  "dependencies": ["phase-1-auth-types"],
  "model": "claude-opus",
  "thinkingLevel": "medium",
  "planningMode": "spec"
}
```

**Phase 3: API Routes**

```json
{
  "id": "phase-3-auth-routes",
  "category": "Core",
  "title": "Authentication API Endpoints",
  "description": "Create REST API endpoints for authentication.\n\nEndpoints:\n- POST /api/auth/login - Email/password login\n- POST /api/auth/register - New user registration\n- POST /api/auth/logout - End session\n- GET /api/auth/me - Get current user\n- GET /api/auth/oauth/:provider - OAuth initiation\n- GET /api/auth/oauth/:provider/callback - OAuth callback\n\nFiles:\n- apps/server/src/routes/auth/index.ts\n- apps/server/src/routes/auth/routes/*.ts",
  "status": "backlog",
  "priority": 1,
  "complexity": "moderate",
  "dependencies": ["phase-2-auth-service"],
  "model": "claude-sonnet",
  "planningMode": "spec"
}
```

**Phase 4: Frontend UI**

```json
{
  "id": "phase-4-auth-ui",
  "category": "UI/UX",
  "title": "Authentication UI Components",
  "description": "Create login, register, and profile UI components.\n\nComponents:\n- LoginForm with email/password fields and OAuth buttons\n- RegisterForm with validation\n- UserMenu dropdown showing logged-in user\n- AuthProvider context for app-wide auth state\n\nRoutes:\n- /login - Login page\n- /register - Registration page\n- /profile - User profile page\n\nFiles:\n- apps/ui/src/components/auth/*.tsx\n- apps/ui/src/routes/login.tsx\n- apps/ui/src/routes/register.tsx\n- apps/ui/src/hooks/use-auth.ts\n- apps/ui/src/store/auth-store.ts",
  "status": "backlog",
  "priority": 1,
  "complexity": "moderate",
  "dependencies": ["phase-3-auth-routes"],
  "model": "claude-sonnet",
  "planningMode": "spec"
}
```

---

## Parallel vs Sequential Execution

### Features that CAN run in parallel

- Different areas of codebase with no shared files
- Independent bug fixes
- Documentation updates
- UI components that don't share state
- Separate service implementations

### Features that MUST run sequentially

- Type definitions before implementations
- Backend before frontend (if frontend calls backend)
- Database schema before data access
- Shared utilities before consumers

### Expressing Dependencies

```json
{
  "id": "feature-frontend",
  "dependencies": ["feature-types", "feature-backend"]
}
```

Features with dependencies won't start until all dependencies are completed.

---

## Model Selection Guide

| Complexity            | Recommended Model             | Thinking Level | Planning Mode |
| --------------------- | ----------------------------- | -------------- | ------------- |
| Simple (< 1 hour)     | claude-haiku or claude-sonnet | none           | none          |
| Moderate (1-4 hours)  | claude-sonnet                 | none or low    | spec          |
| Complex (> 4 hours)   | claude-opus                   | medium or high | spec or full  |
| Critical/Architecture | claude-opus                   | ultrathink     | full          |

---

## Directory Structure

```
.automaker/
└── features/
    ├── phase-1-foundation/
    │   └── feature.json
    ├── phase-2-backend/
    │   └── feature.json
    ├── phase-3-api/
    │   └── feature.json
    └── phase-4-frontend/
        └── feature.json
```

Each feature gets its own directory. The directory name should match the feature ID.

---

## Automation Script

Create features programmatically with this pattern:

```bash
#!/bin/bash
# create-feature.sh

FEATURE_ID=$1
TITLE=$2
DESCRIPTION=$3
PRIORITY=${4:-1}

mkdir -p ".automaker/features/$FEATURE_ID"
cat > ".automaker/features/$FEATURE_ID/feature.json" << EOF
{
  "id": "$FEATURE_ID",
  "category": "Core",
  "title": "$TITLE",
  "description": "$DESCRIPTION",
  "status": "backlog",
  "priority": $PRIORITY,
  "complexity": "moderate",
  "dependencies": [],
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "updatedAt": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "model": "claude-sonnet",
  "planningMode": "spec"
}
EOF

echo "Created feature: $FEATURE_ID"
```

---

## Best Practices

### DO

- Keep descriptions detailed but focused
- Include specific file paths when known
- Use GIVEN/WHEN/THEN format for acceptance criteria
- Set realistic complexity estimates
- Define clear dependencies between phases
- Use `spec` planning mode for moderate+ complexity
- Include edge cases in descriptions

### DON'T

- Create features that are too large (> 8 hours)
- Leave descriptions vague ("make it better")
- Skip dependency definitions
- Use `ultrathink` for simple tasks (wastes tokens)
- Create circular dependencies
- Put multiple unrelated changes in one feature
- Put values in `imagePaths` or `textFilePaths` (must be empty `[]`, Automaker populates them)

---

## Validation Checklist

Before running features, verify:

- [ ] Each feature has a unique ID
- [ ] All dependencies exist and are spelled correctly
- [ ] No circular dependencies
- [ ] Priorities are assigned meaningfully
- [ ] Complex features have appropriate model/thinking level
- [ ] Descriptions include enough context for implementation
- [ ] File paths match actual project structure

---

## Quick Reference: Status Flow

```
backlog → pending → running → completed → verified
                           ↘ failed
                           ↘ waiting_approval → completed
```

**Important:** Features must start in `backlog` status to be executable by Automaker. The system moves them through the pipeline automatically.

---

## Template: New Feature

Copy and customize:

```json
{
  "id": "feature-CHANGE-ME",
  "category": "Core",
  "title": "CHANGE ME: Feature Title",
  "description": "## Overview\nBrief description.\n\n## Requirements\n- Requirement 1\n- Requirement 2\n\n## Files\n- path/to/file.ts",
  "status": "backlog",
  "priority": 1,
  "complexity": "moderate",
  "dependencies": [],
  "createdAt": "2026-01-23T00:00:00.000Z",
  "updatedAt": "2026-01-23T00:00:00.000Z",
  "imagePaths": [],
  "textFilePaths": [],
  "model": "claude-sonnet",
  "planningMode": "spec",
  "skipTests": false,
  "workMode": "auto"
}
```
