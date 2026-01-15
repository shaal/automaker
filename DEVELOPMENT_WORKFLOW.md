# Development Workflow

This document defines the standard workflow for keeping a branch in sync with the upstream
release candidate (RC) and for shipping feature work. It is paired with `check-sync.sh`.

## Quick Decision Rule

1. Ask the user to select a workflow:
   - **Sync Workflow** → you are maintaining the current RC branch with fixes/improvements
     and will push the same fixes to both origin and upstream RC when you have local
     commits to publish.
   - **PR Workflow** → you are starting new feature work on a new branch; upstream updates
     happen via PR only.
2. After the user selects, run:
   ```bash
   ./check-sync.sh
   ```
3. Use the status output to confirm alignment. If it reports **diverged**, default to
   merging `upstream/<TARGET_RC>` into the current branch and preserving local commits.
   For Sync Workflow, when the working tree is clean and you are behind upstream RC,
   proceed with the fetch + merge without asking for additional confirmation.

## Target RC Resolution

The target RC is resolved dynamically so the workflow stays current as the RC changes.

Resolution order:

1. Latest `upstream/v*rc` branch (auto-detected)
2. `upstream/HEAD` (fallback)
3. If neither is available, you must pass `--rc <branch>`

Override for a single run:

```bash
./check-sync.sh --rc <rc-branch>
```

## Pre-Flight Checklist

1. Confirm a clean working tree:
   ```bash
   git status
   ```
2. Confirm the current branch:
   ```bash
   git branch --show-current
   ```
3. Ensure remotes exist (origin + upstream):
   ```bash
   git remote -v
   ```

## Sync Workflow (Upstream Sync)

Use this flow when you are updating the current branch with fixes or improvements and
intend to keep origin and upstream RC in lockstep.

1. **Check sync status**
   ```bash
   ./check-sync.sh
   ```
2. **Update from upstream RC before editing (no pulls)**
   - **Behind upstream RC** → fetch and merge RC into your branch:
     ```bash
     git fetch upstream
     git merge upstream/<TARGET_RC> --no-edit
     ```
     When the working tree is clean and the user selected Sync Workflow, proceed without
     an extra confirmation prompt.
   - **Diverged** → stop and resolve manually.
3. **Resolve conflicts if needed**
   - Handle conflicts intelligently: preserve upstream behavior and your local intent.
4. **Make changes and commit (if you are delivering fixes)**
   ```bash
   git add -A
   git commit -m "type: description"
   ```
5. **Build to verify**
   ```bash
   npm run build:packages
   npm run build
   ```
6. **Push after a successful merge to keep remotes aligned**
   - If you only merged upstream RC changes, push **origin only** to sync your fork:
     ```bash
     git push origin <branch>
     ```
   - If you have local fixes to publish, push **origin + upstream**:
     ```bash
     git push origin <branch>
     git push upstream <branch>:<TARGET_RC>
     ```
   - Always ask the user which push to perform.
   - Origin (origin-only sync):
     ```bash
     git push origin <branch>
     ```
   - Upstream RC (publish the same fixes when you have local commits):
     ```bash
     git push upstream <branch>:<TARGET_RC>
     ```
7. **Re-check sync**
   ```bash
   ./check-sync.sh
   ```

## PR Workflow (Feature Work)

Use this flow only for new feature work on a new branch. Do not push to upstream RC.

1. **Create or switch to a feature branch**
   ```bash
   git checkout -b <branch>
   ```
2. **Make changes and commit**
   ```bash
   git add -A
   git commit -m "type: description"
   ```
3. **Merge upstream RC before shipping**
   ```bash
   git merge upstream/<TARGET_RC> --no-edit
   ```
4. **Build and/or test**
   ```bash
   npm run build:packages
   npm run build
   ```
5. **Push to origin**
   ```bash
   git push -u origin <branch>
   ```
6. **Create or update the PR**
   - Use `gh pr create` or the GitHub UI.
7. **Review and follow-up**

- Apply feedback, commit changes, and push again.
- Re-run `./check-sync.sh` if additional upstream sync is needed.

## Conflict Resolution Checklist

1. Identify which changes are from upstream vs. local.
2. Preserve both behaviors where possible; avoid dropping either side.
3. Prefer minimal, safe integrations over refactors.
4. Re-run build commands after resolving conflicts.
5. Re-run `./check-sync.sh` to confirm status.

## Build/Test Matrix

- **Sync Workflow**: `npm run build:packages` and `npm run build`.
- **PR Workflow**: `npm run build:packages` and `npm run build` (plus relevant tests).

## Post-Sync Verification

1. `git status` should be clean.
2. `./check-sync.sh` should show expected alignment.
3. Verify recent commits with:
   ```bash
   git log --oneline -5
   ```

## check-sync.sh Usage

- Uses dynamic Target RC resolution (see above).
- Override target RC:
  ```bash
  ./check-sync.sh --rc <rc-branch>
  ```
- Optional preview limit:
  ```bash
  ./check-sync.sh --preview 10
  ```
- The script prints sync status for both origin and upstream and previews recent commits
  when you are behind.

## Stop Conditions

Stop and ask for guidance if any of the following are true:

- The working tree is dirty and you are about to merge or push.
- `./check-sync.sh` reports **diverged** during PR Workflow, or a merge cannot be completed.
- The script cannot resolve a target RC and requests `--rc`.
- A build fails after sync or conflict resolution.

## AI Agent Guardrails

- Always run `./check-sync.sh` before merges or pushes.
- Always ask for explicit user approval before any push command.
- Do not ask for additional confirmation before a Sync Workflow fetch + merge when the
  working tree is clean and the user has already selected the Sync Workflow.
- Choose Sync vs PR workflow based on intent (RC maintenance vs new feature work), not
  on the script's workflow hint.
- Only use force push when the user explicitly requests a history rewrite.
- Ask for explicit approval before dependency installs, branch deletion, or destructive operations.
- When resolving merge conflicts, preserve both upstream changes and local intent where possible.
- Do not create or switch to new branches unless the user explicitly requests it.

## AI Agent Decision Guidance

Agents should provide concrete, task-specific suggestions instead of repeatedly asking
open-ended questions. Use the user's stated goal and the `./check-sync.sh` status to
propose a default path plus one or two alternatives, and only ask for confirmation when
an action requires explicit approval.

Default behavior:

- If the intent is RC maintenance, recommend the Sync Workflow and proceed with
  safe preparation steps (status checks, previews). If the branch is behind upstream RC,
  fetch and merge without additional confirmation when the working tree is clean, then
  push to origin to keep the fork aligned. Push upstream only when there are local fixes
  to publish.
- If the intent is new feature work, recommend the PR Workflow and proceed with safe
  preparation steps (status checks, identifying scope). Ask for approval before merges,
  pushes, or dependency installs.
- If `./check-sync.sh` reports **diverged** during Sync Workflow, merge
  `upstream/<TARGET_RC>` into the current branch and preserve local commits.
- If `./check-sync.sh` reports **diverged** during PR Workflow, stop and ask for guidance
  with a short explanation of the divergence and the minimal options to resolve it.
  If the user's intent is RC maintenance, prefer the Sync Workflow regardless of the
  script hint. When the intent is new feature work, use the PR Workflow and avoid upstream
  RC pushes.

Suggestion format (keep it short):

- **Recommended**: one sentence with the default path and why it fits the task.
- **Alternatives**: one or two options with the tradeoff or prerequisite.
- **Approval points**: mention any upcoming actions that need explicit approval (exclude sync
  workflow pushes and merges).

## Failure Modes and How to Avoid Them

Sync Workflow:

- Wrong RC target: verify the auto-detected RC in `./check-sync.sh` output before merging.
- Diverged from upstream RC: stop and resolve manually before any merge or push.
- Dirty working tree: commit or stash before syncing to avoid accidental merges.
- Missing remotes: ensure both `origin` and `upstream` are configured before syncing.
- Build breaks after sync: run `npm run build:packages` and `npm run build` before pushing.

PR Workflow:

- Branch not synced to current RC: re-run `./check-sync.sh` and merge RC before shipping.
- Pushing the wrong branch: confirm `git branch --show-current` before pushing.
- Unreviewed changes: always commit and push to origin before opening or updating a PR.
- Skipped tests/builds: run the build commands before declaring the PR ready.

## Notes

- Avoid merging with uncommitted changes; commit or stash first.
- Prefer merge over rebase for PR branches; rebases rewrite history and often require a force push,
  which should only be done with an explicit user request.
- Use clear, conventional commit messages and split unrelated changes into separate commits.
