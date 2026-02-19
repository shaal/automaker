export const commitTemplate = {
  id: 'commit',
  name: 'Commit Changes',
  colorClass: 'bg-purple-500/20',
  instructions: `## Commit Changes Step

# ⚠️ CRITICAL REQUIREMENT: YOU MUST COMMIT ALL CHANGES USING CONVENTIONAL COMMIT FORMAT ⚠️

**THIS IS NOT OPTIONAL. YOU MUST CREATE AND EXECUTE A GIT COMMIT WITH ALL CHANGES.**

This step requires you to:
1. **REVIEW** all changes made in this feature
2. **CREATE** a conventional commit message
3. **EXECUTE** the git commit command

**You cannot complete this step by only reviewing changes. You MUST execute the git commit command.**

---

### Phase 1: Review Phase
Review all changes made in this feature:

- Review all modified files using \`git status\` and \`git diff\`
- Identify the scope and nature of changes
- Determine the appropriate conventional commit type
- Identify any breaking changes that need to be documented

---

### Phase 2: Commit Phase - ⚠️ MANDATORY ACTION REQUIRED ⚠️

**YOU MUST NOW CREATE AND EXECUTE A GIT COMMIT WITH ALL CHANGES.**

**This is not optional. You must stage all changes and commit them using conventional commit format.**

#### Conventional Commit Format

Follow this format for your commit message:

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

#### Commit Types (choose the most appropriate):

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring without changing functionality
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Changes to build process, dependencies, or tooling
- **ci**: Changes to CI configuration
- **build**: Changes to build system or dependencies

#### Scope (optional but recommended):
- Component/module name (e.g., \`ui\`, \`server\`, \`auth\`)
- Feature area (e.g., \`board\`, \`pipeline\`, \`agent\`)
- Package name (e.g., \`@automaker/types\`)

#### Subject:
- Use imperative mood: "add" not "added" or "adds"
- First letter lowercase
- No period at the end
- Maximum 72 characters

#### Body (optional but recommended for significant changes):
- Explain the "what" and "why" of the change
- Reference related issues or PRs
- Separate from subject with blank line
- Wrap at 72 characters

#### Footer (optional):
- Breaking changes: \`BREAKING CHANGE: <description>\`
- Issue references: \`Closes #123\`, \`Fixes #456\`

#### Action Steps (You MUST complete these):

1. **Stage All Changes** - PREPARE FOR COMMIT:
   - ✅ Run \`git add .\` or \`git add -A\` to stage all changes
   - ✅ Verify staged changes with \`git status\`
   - ✅ Ensure all relevant changes are staged

2. **Create Commit Message** - FOLLOW CONVENTIONAL COMMIT FORMAT:
   - ✅ Determine the appropriate commit type based on changes
   - ✅ Identify the scope (component/module/feature)
   - ✅ Write a clear, imperative subject line
   - ✅ Add a body explaining the changes (if significant)
   - ✅ Include breaking changes in footer if applicable
   - ✅ Reference related issues if applicable

3. **Execute Commit** - COMMIT THE CHANGES:
   - ✅ Run \`git commit -m "<type>(<scope>): <subject>" -m "<body>"\` or use a multi-line commit message
   - ✅ Verify the commit was created with \`git log -1\`
   - ✅ **EXECUTE THE ACTUAL GIT COMMIT COMMAND**

#### Example Commit Messages:

\`\`\`
feat(ui): add pipeline step commit template

Add a new pipeline step template for committing changes using
conventional commit format. This ensures all commits follow
a consistent pattern for better changelog generation.

Closes #123
\`\`\`

\`\`\`
fix(server): resolve agent session timeout issue

The agent session was timing out prematurely due to incorrect
WebSocket heartbeat configuration. Updated heartbeat interval
to match server expectations.

Fixes #456
\`\`\`

\`\`\`
refactor(pipeline): extract step template logic

Extract step template loading and validation into separate
utility functions to improve code organization and testability.
\`\`\`

---

### Summary Required
After completing BOTH review AND commit phases, provide:
- A summary of all changes that were committed
- **The exact commit message that was used (this proves you executed the commit)**
- The commit hash (if available)
- Any notes about the commit (breaking changes, related issues, etc.)

---

# ⚠️ FINAL REMINDER ⚠️

**Reviewing changes without committing is INCOMPLETE and UNACCEPTABLE.**

**You MUST stage all changes and execute a git commit command.**
**You MUST use conventional commit format for the commit message.**
**You MUST show evidence of the commit execution in your summary.**
**This step is only complete when changes have been committed to git.**`,
};
