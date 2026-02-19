# Implementation Plan: Custom Terminal Configurations with Theme Synchronization

## Overview

Implement custom shell configuration files (.bashrc, .zshrc) that automatically sync with Automaker's 40 themes, providing a seamless terminal experience where prompt colors match the app theme. This is an **opt-in feature** that creates configs in `.automaker/terminal/` without modifying user's existing RC files.

## Architecture

### Core Components

1. **RC Generator** (`libs/platform/src/rc-generator.ts`) - NEW
   - Template-based generation for bash/zsh/sh
   - Theme-to-ANSI color mapping from hex values
   - Git info integration (branch, dirty status)
   - Prompt format templates (standard, minimal, powerline, starship-inspired)

2. **RC File Manager** (`libs/platform/src/rc-file-manager.ts`) - NEW
   - File I/O for `.automaker/terminal/` directory
   - Version checking and regeneration logic
   - Path resolution for different shells

3. **Terminal Service** (`apps/server/src/services/terminal-service.ts`) - MODIFY
   - Inject BASH_ENV/ZDOTDIR environment variables when spawning PTY
   - Hook for theme change regeneration
   - Backwards compatible (no change when disabled)

4. **Settings Schema** (`libs/types/src/settings.ts`) - MODIFY
   - Add `terminalConfig` to GlobalSettings and ProjectSettings
   - Include enable toggle, prompt format, git info toggles, custom aliases/env vars

5. **Settings UI** (`apps/ui/src/components/views/settings-view/terminal/terminal-config-section.tsx`) - NEW
   - Enable/disable toggle with explanation
   - Prompt format selector (4 formats)
   - Git info toggles (branch/status)
   - Custom aliases textarea
   - Custom env vars key-value editor
   - Live preview panel showing example prompt

## File Structure

```
.automaker/terminal/
├── bashrc.sh          # Bash config (sourced via BASH_ENV)
├── zshrc.zsh          # Zsh config (via ZDOTDIR)
├── common.sh          # Shared functions (git prompt, etc.)
├── themes/
│   ├── dark.sh        # Theme-specific color exports (40 files)
│   ├── dracula.sh
│   ├── nord.sh
│   └── ... (38 more)
├── version.txt        # RC file format version (for migrations)
└── user-custom.sh     # User's additional customizations (optional)
```

## Implementation Steps

### Step 1: Create RC Generator Package

**File**: `libs/platform/src/rc-generator.ts`

**Key Functions**:

```typescript
// Main generation functions
export function generateBashrc(theme: ThemeMode, config: TerminalConfig): string;
export function generateZshrc(theme: ThemeMode, config: TerminalConfig): string;
export function generateCommonFunctions(): string;
export function generateThemeColors(theme: ThemeMode): string;

// Color mapping
export function hexToXterm256(hex: string): number;
export function getThemeANSIColors(terminalTheme: TerminalTheme): ANSIColors;
```

**Templates**:

- Source user's original ~/.bashrc or ~/.zshrc first
- Load theme colors from `themes/${AUTOMAKER_THEME}.sh`
- Set custom PS1/PROMPT only if `AUTOMAKER_CUSTOM_PROMPT=true`
- Include git prompt function: `automaker_git_prompt()`

**Example bashrc.sh template**:

```bash
#!/bin/bash
# Automaker Terminal Configuration v1.0

# Source user's original bashrc first
if [ -f "$HOME/.bashrc" ]; then
    source "$HOME/.bashrc"
fi

# Load Automaker theme colors
AUTOMAKER_THEME="${AUTOMAKER_THEME:-dark}"
if [ -f "${BASH_SOURCE%/*}/themes/$AUTOMAKER_THEME.sh" ]; then
    source "${BASH_SOURCE%/*}/themes/$AUTOMAKER_THEME.sh"
fi

# Load common functions (git prompt)
source "${BASH_SOURCE%/*}/common.sh"

# Set custom prompt (only if enabled)
if [ "$AUTOMAKER_CUSTOM_PROMPT" = "true" ]; then
    PS1="\[$COLOR_USER\]\u@\h\[$COLOR_RESET\] "
    PS1="$PS1\[$COLOR_PATH\]\w\[$COLOR_RESET\]"
    PS1="$PS1\$(automaker_git_prompt) "
    PS1="$PS1\[$COLOR_PROMPT\]\$\[$COLOR_RESET\] "
fi

# Load user customizations (if exists)
if [ -f "${BASH_SOURCE%/*}/user-custom.sh" ]; then
    source "${BASH_SOURCE%/*}/user-custom.sh"
fi
```

**Color Mapping Algorithm**:

1. Get hex colors from `apps/ui/src/config/terminal-themes.ts` (TerminalTheme interface)
2. Convert hex to RGB
3. Map to closest xterm-256 color code using Euclidean distance in RGB space
4. Generate ANSI escape codes: `\[\e[38;5;{code}m\]` for foreground

### Step 2: Create RC File Manager

**File**: `libs/platform/src/rc-file-manager.ts`

**Key Functions**:

```typescript
export async function ensureTerminalDir(projectPath: string): Promise<void>;
export async function writeRcFiles(
  projectPath: string,
  theme: ThemeMode,
  config: TerminalConfig
): Promise<void>;
export function getRcFilePath(projectPath: string, shell: 'bash' | 'zsh' | 'sh'): string;
export async function checkRcFileVersion(projectPath: string): Promise<number | null>;
export async function needsRegeneration(
  projectPath: string,
  theme: ThemeMode,
  config: TerminalConfig
): Promise<boolean>;
```

**File Operations**:

- Create `.automaker/terminal/` if doesn't exist
- Write RC files with 0644 permissions
- Write theme color files (40 themes × 1 file each)
- Create version.txt with format version (currently "11")
- Support atomic writes (write to temp, then rename)

### Step 3: Add Settings Schema

**File**: `libs/types/src/settings.ts`

**Add to GlobalSettings** (around line 842):

```typescript
/** Terminal configuration settings */
terminalConfig?: {
  /** Enable custom terminal configurations (default: false) */
  enabled: boolean;

  /** Enable custom prompt (default: true when enabled) */
  customPrompt: boolean;

  /** Prompt format template */
  promptFormat: 'standard' | 'minimal' | 'powerline' | 'starship';

  /** Prompt theme preset */
  promptTheme?: TerminalPromptTheme;

  /** Show git branch in prompt (default: true) */
  showGitBranch: boolean;

  /** Show git status dirty indicator (default: true) */
  showGitStatus: boolean;

  /** Show user and host in prompt (default: true) */
  showUserHost: boolean;

  /** Show path in prompt (default: true) */
  showPath: boolean;

  /** Path display style */
  pathStyle: 'full' | 'short' | 'basename';

  /** Limit path depth (0 = full path) */
  pathDepth: number;

  /** Show current time in prompt (default: false) */
  showTime: boolean;

  /** Show last command exit status when non-zero (default: false) */
  showExitStatus: boolean;

  /** User-provided custom aliases (multiline string) */
  customAliases: string;

  /** User-provided custom env vars */
  customEnvVars: Record<string, string>;

  /** RC file format version (for migration) */
  rcFileVersion?: number;
};
```

**Add to ProjectSettings**:

```typescript
/** Project-specific terminal config overrides */
terminalConfig?: {
  /** Override global enabled setting */
  enabled?: boolean;

  /** Override prompt theme preset */
  promptTheme?: TerminalPromptTheme;

  /** Override showing user/host */
  showUserHost?: boolean;

  /** Override showing path */
  showPath?: boolean;

  /** Override path style */
  pathStyle?: 'full' | 'short' | 'basename';

  /** Override path depth (0 = full path) */
  pathDepth?: number;

  /** Override showing time */
  showTime?: boolean;

  /** Override showing exit status */
  showExitStatus?: boolean;

  /** Project-specific custom aliases */
  customAliases?: string;

  /** Project-specific env vars */
  customEnvVars?: Record<string, string>;

  /** Custom welcome message for this project */
  welcomeMessage?: string;
};
```

**Defaults**:

```typescript
const DEFAULT_TERMINAL_CONFIG = {
  enabled: false,
  customPrompt: true,
  promptFormat: 'standard' as const,
  promptTheme: 'custom' as const,
  showGitBranch: true,
  showGitStatus: true,
  showUserHost: true,
  showPath: true,
  pathStyle: 'full' as const,
  pathDepth: 0,
  showTime: false,
  showExitStatus: false,
  customAliases: '',
  customEnvVars: {},
  rcFileVersion: 11,
};
```

**Oh My Posh Themes**:

- When `promptTheme` starts with `omp-` and `oh-my-posh` is available, the generated RC files will
  initialize oh-my-posh with the selected theme name.
- If oh-my-posh is not installed, the prompt falls back to the Automaker-built prompt format.
- `POSH_THEMES_PATH` is exported to the standard user themes directory so themes resolve offline.

### Step 4: Modify Terminal Service

**File**: `apps/server/src/services/terminal-service.ts`

**Modification Point**: In `createSession()` method, around line 335-344 where `env` object is built.

**Add before PTY spawn**:

```typescript
// Get terminal config from settings
const terminalConfig = await this.settingsService?.getGlobalSettings();
const projectSettings = options.projectPath
  ? await this.settingsService?.getProjectSettings(options.projectPath)
  : null;

const effectiveTerminalConfig = {
  ...terminalConfig?.terminalConfig,
  ...projectSettings?.terminalConfig,
};

if (effectiveTerminalConfig?.enabled) {
  // Ensure RC files are up to date
  const currentTheme = terminalConfig?.theme || 'dark';
  await ensureRcFilesUpToDate(options.projectPath || cwd, currentTheme, effectiveTerminalConfig);

  // Set shell-specific env vars
  const shellName = path.basename(shell).toLowerCase();

  if (shellName.includes('bash')) {
    env.BASH_ENV = getRcFilePath(options.projectPath || cwd, 'bash');
    env.AUTOMAKER_CUSTOM_PROMPT = effectiveTerminalConfig.customPrompt ? 'true' : 'false';
    env.AUTOMAKER_THEME = currentTheme;
  } else if (shellName.includes('zsh')) {
    env.ZDOTDIR = path.join(options.projectPath || cwd, '.automaker', 'terminal');
    env.AUTOMAKER_CUSTOM_PROMPT = effectiveTerminalConfig.customPrompt ? 'true' : 'false';
    env.AUTOMAKER_THEME = currentTheme;
  } else if (shellName === 'sh') {
    env.ENV = getRcFilePath(options.projectPath || cwd, 'sh');
    env.AUTOMAKER_CUSTOM_PROMPT = effectiveTerminalConfig.customPrompt ? 'true' : 'false';
    env.AUTOMAKER_THEME = currentTheme;
  }
}
```

**Add new method for theme changes**:

```typescript
async onThemeChange(projectPath: string, newTheme: ThemeMode): Promise<void> {
  const globalSettings = await this.settingsService?.getGlobalSettings();
  const terminalConfig = globalSettings?.terminalConfig;

  if (terminalConfig?.enabled) {
    // Regenerate RC files with new theme
    await writeRcFiles(projectPath, newTheme, terminalConfig);
  }
}
```

### Step 5: Create Settings UI

**File**: `apps/ui/src/components/views/settings-view/terminal/terminal-config-section.tsx`

**Component Structure**:

```typescript
export function TerminalConfigSection() {
  return (
    <div>
      {/* Enable Toggle with Warning */}
      <div>
        <Label>Custom Terminal Configurations</Label>
        <Switch checked={enabled} onCheckedChange={handleToggle} />
        <p>Creates custom shell configs in .automaker/terminal/</p>
      </div>

      {enabled && (
        <>
          {/* Custom Prompt Toggle */}
          <Switch checked={customPrompt} />

          {/* Prompt Format Selector */}
          <Select value={promptFormat} onValueChange={setPromptFormat}>
            <option value="standard">Standard</option>
            <option value="minimal">Minimal</option>
            <option value="powerline">Powerline</option>
            <option value="starship">Starship-Inspired</option>
          </Select>

          {/* Git Info Toggles */}
          <Switch checked={showGitBranch} label="Show Git Branch" />
          <Switch checked={showGitStatus} label="Show Git Status" />

          {/* Custom Aliases */}
          <Textarea
            value={customAliases}
            placeholder="# Custom aliases\nalias ll='ls -la'"
          />

          {/* Custom Env Vars */}
          <KeyValueEditor
            value={customEnvVars}
            onChange={setCustomEnvVars}
          />

          {/* Live Preview Panel */}
          <PromptPreview
            format={promptFormat}
            theme={effectiveTheme}
            gitBranch={showGitBranch ? 'main' : null}
            gitDirty={showGitStatus}
          />
        </>
      )}
    </div>
  );
}
```

**Preview Component**:
Shows example prompt like: `[user@host] ~/projects/automaker (main*) $`
Updates instantly when theme or format changes.

### Step 6: Theme Change Hook

**File**: `apps/server/src/routes/settings.ts`

**Hook into theme update endpoint**:

```typescript
// After updating theme in settings
if (oldTheme !== newTheme) {
  // Regenerate RC files for all projects with terminal config enabled
  const projects = settings.projects;
  for (const project of projects) {
    const projectSettings = await settingsService.getProjectSettings(project.path);
    if (projectSettings.terminalConfig?.enabled !== false) {
      await terminalService.onThemeChange(project.path, newTheme);
    }
  }
}
```

## Shell Configuration Strategy

### Bash (via BASH_ENV)

- Set `BASH_ENV=/path/to/.automaker/terminal/bashrc.sh`
- BASH_ENV is loaded for all shells (interactive and non-interactive)
- User's ~/.bashrc is sourced first within our bashrc.sh
- No need for `--rcfile` flag (which would skip ~/.bashrc)

### Zsh (via ZDOTDIR)

- Set `ZDOTDIR=/path/to/.automaker/terminal/`
- Create `.zshrc` symlink: `zshrc.zsh`
- User's ~/.zshrc is sourced within our zshrc.zsh
- Zsh's canonical configuration directory mechanism

### Sh (via ENV)

- Set `ENV=/path/to/.automaker/terminal/common.sh`
- POSIX shell standard environment variable
- Minimal prompt (POSIX sh doesn't support advanced prompts)

## Prompt Formats

### 1. Standard

```
[user@host] ~/path/to/project (main*) $
```

### 2. Minimal

```
~/project (main*) $
```

### 3. Powerline (Unicode box-drawing)

```
┌─[user@host]─[~/path]─[main*]
└─$
```

### 4. Starship-Inspired

```
user@host in ~/path on main*
❯
```

## Theme Synchronization

### On Initial Enable

1. User toggles "Enable Custom Terminal Configs"
2. Show confirmation dialog explaining what will happen
3. Generate RC files for current theme
4. Set `rcFileVersion: 11` in settings

### On Theme Change

1. User changes app theme in settings
2. Settings API detects theme change
3. Call `terminalService.onThemeChange()` for each project
4. Regenerate theme color files (`.automaker/terminal/themes/`)
5. Existing terminals keep old theme (expected behavior)
6. New terminals use new theme

### On Disable

1. User toggles off "Enable Custom Terminal Configs"
2. Delete `.automaker/terminal/` directory
3. New terminals spawn without custom env vars
4. Existing terminals continue with current config until restarted

## Critical Files

### Files to Modify

1. `/home/dhanush/Projects/automaker/apps/server/src/services/terminal-service.ts` - Add env var injection logic at line ~335-344
2. `/home/dhanush/Projects/automaker/libs/types/src/settings.ts` - Add terminalConfig to GlobalSettings (~line 842) and ProjectSettings
3. `/home/dhanush/Projects/automaker/apps/server/src/routes/settings.ts` - Add theme change hook

### Files to Create

1. `/home/dhanush/Projects/automaker/libs/platform/src/rc-generator.ts` - RC file generation logic
2. `/home/dhanush/Projects/automaker/libs/platform/src/rc-file-manager.ts` - File I/O and path resolution
3. `/home/dhanush/Projects/automaker/apps/ui/src/components/views/settings-view/terminal/terminal-config-section.tsx` - Settings UI
4. `/home/dhanush/Projects/automaker/apps/ui/src/components/views/settings-view/terminal/prompt-preview.tsx` - Live preview component

### Files to Read

1. `/home/dhanush/Projects/automaker/apps/ui/src/config/terminal-themes.ts` - Source of theme hex colors for ANSI mapping

## Testing Approach

### Unit Tests

- `rc-generator.test.ts`: Test template generation for all 40 themes
- `rc-file-manager.test.ts`: Test file I/O and version checking
- `terminal-service.test.ts`: Test env var injection with mocked PTY spawn

### E2E Tests

- Enable custom configs in settings
- Change theme and verify new terminals use new colors
- Add custom aliases and verify they work in terminal
- Test all 4 prompt formats
- Test disable flow (files removed, terminals work normally)

### Manual Testing Checklist

- [ ] Test on macOS with zsh
- [ ] Test on Linux with bash
- [ ] Test all 40 themes have correct colors
- [ ] Test git prompt in repo vs non-repo directories
- [ ] Test custom aliases execution
- [ ] Test custom env vars available
- [ ] Test project-specific overrides
- [ ] Test disable/re-enable flow

## Verification

### End-to-End Test

1. Enable custom terminal configs in settings
2. Set prompt format to "powerline"
3. Add custom alias: `alias gs='git status'`
4. Change theme to "dracula"
5. Open new terminal
6. Verify:
   - Prompt uses powerline format with theme colors
   - Git branch shows if in repo
   - `gs` alias works
   - User's ~/.bashrc still loaded (test with known alias from user's file)
7. Change theme to "nord"
8. Open new terminal
9. Verify prompt colors changed to match nord theme
10. Disable custom configs
11. Verify `.automaker/terminal/` deleted
12. Open new terminal
13. Verify standard prompt without custom config

### Success Criteria

- ✅ Feature can be enabled/disabled in settings
- ✅ RC files generated in `.automaker/terminal/`
- ✅ Prompt colors match theme (all 40 themes)
- ✅ Git branch/status shown in prompt
- ✅ Custom aliases work
- ✅ Custom env vars available
- ✅ User's original ~/.bashrc or ~/.zshrc still loads
- ✅ Theme changes regenerate color files
- ✅ Works on Mac (zsh) and Linux (bash)
- ✅ No breaking changes to existing terminal functionality

## Security & Safety

### File Permissions

- RC files: 0644 (user read/write, others read)
- Directory: 0755 (user rwx, others rx)
- No secrets in RC files

### Input Sanitization

- Escape special characters in custom aliases
- Validate env var names (alphanumeric + underscore only)
- No eval of user-provided code
- Shell escaping for all user inputs

### Backwards Compatibility

- Feature disabled by default
- Existing terminals unaffected when disabled
- User's original RC files always sourced first
- Easy rollback (just disable and delete files)

## Branch Creation

Per PR workflow in DEVELOPMENT_WORKFLOW.md:

1. Create feature branch: `git checkout -b feature/custom-terminal-configs`
2. Implement changes following this plan
3. Test thoroughly
4. Merge upstream RC before shipping: `git merge upstream/v0.14.0rc --no-edit`
5. Push to origin: `git push -u origin feature/custom-terminal-configs`
6. Create PR targeting `main` branch

## Documentation

After implementation, create comprehensive documentation at:
`/home/dhanush/Projects/automaker/docs/terminal-custom-configs.md`

**Documentation should cover**:

- Feature overview and benefits
- How to enable custom terminal configs
- Prompt format options with examples
- Custom aliases and env vars
- Theme synchronization behavior
- Troubleshooting common issues
- How to disable the feature
- Technical details for contributors

## Timeline Estimate

- Week 1: Core infrastructure (RC generator, file manager, settings schema)
- Week 2: Terminal service integration, theme sync
- Week 3: Settings UI, preview component
- Week 4: Testing, documentation, polish

Total: ~4 weeks for complete implementation
