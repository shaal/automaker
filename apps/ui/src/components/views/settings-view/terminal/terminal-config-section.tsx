/**
 * Terminal Config Section - Custom terminal configurations with theme synchronization
 *
 * This component provides UI for enabling custom terminal prompts that automatically
 * sync with Automaker's 40 themes. It's an opt-in feature that generates shell configs
 * in .automaker/terminal/ without modifying user's existing RC files.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Wand2, GitBranch, Info, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { PromptPreview } from './prompt-preview';
import type { TerminalPromptTheme } from '@automaker/types';
import {
  PROMPT_THEME_CUSTOM_ID,
  PROMPT_THEME_PRESETS,
  getMatchingPromptThemeId,
  getPromptThemePreset,
  type PromptThemeConfig,
} from './prompt-theme-presets';
import { useUpdateGlobalSettings } from '@/hooks/mutations/use-settings-mutations';
import { useGlobalSettings } from '@/hooks/queries/use-settings';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export function TerminalConfigSection() {
  const PATH_DEPTH_MIN = 0;
  const PATH_DEPTH_MAX = 10;
  const ENV_VAR_UPDATE_DEBOUNCE_MS = 400;
  const ENV_VAR_ID_PREFIX = 'env';
  const TERMINAL_RC_FILE_VERSION = 11;
  const { theme } = useAppStore();
  const { data: globalSettings } = useGlobalSettings();
  const updateGlobalSettings = useUpdateGlobalSettings({ showSuccessToast: false });
  const envVarIdRef = useRef(0);
  const envVarUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createEnvVarEntry = useCallback(
    (key = '', value = '') => {
      envVarIdRef.current += 1;
      return {
        id: `${ENV_VAR_ID_PREFIX}-${envVarIdRef.current}`,
        key,
        value,
      };
    },
    [ENV_VAR_ID_PREFIX]
  );
  const [localEnvVars, setLocalEnvVars] = useState<
    Array<{ id: string; key: string; value: string }>
  >(() =>
    Object.entries(globalSettings?.terminalConfig?.customEnvVars || {}).map(([key, value]) =>
      createEnvVarEntry(key, value)
    )
  );
  const [showEnableConfirm, setShowEnableConfirm] = useState(false);

  const clampPathDepth = (value: number) =>
    Math.min(PATH_DEPTH_MAX, Math.max(PATH_DEPTH_MIN, value));

  const defaultTerminalConfig = {
    enabled: false,
    customPrompt: true,
    promptFormat: 'standard' as const,
    promptTheme: PROMPT_THEME_CUSTOM_ID,
    showGitBranch: true,
    showGitStatus: true,
    showUserHost: true,
    showPath: true,
    pathStyle: 'full' as const,
    pathDepth: PATH_DEPTH_MIN,
    showTime: false,
    showExitStatus: false,
    customAliases: '',
    customEnvVars: {},
  };

  const terminalConfig = {
    ...defaultTerminalConfig,
    ...globalSettings?.terminalConfig,
    customAliases:
      globalSettings?.terminalConfig?.customAliases ?? defaultTerminalConfig.customAliases,
    customEnvVars:
      globalSettings?.terminalConfig?.customEnvVars ?? defaultTerminalConfig.customEnvVars,
  };

  const promptThemeConfig: PromptThemeConfig = {
    promptFormat: terminalConfig.promptFormat,
    showGitBranch: terminalConfig.showGitBranch,
    showGitStatus: terminalConfig.showGitStatus,
    showUserHost: terminalConfig.showUserHost,
    showPath: terminalConfig.showPath,
    pathStyle: terminalConfig.pathStyle,
    pathDepth: terminalConfig.pathDepth,
    showTime: terminalConfig.showTime,
    showExitStatus: terminalConfig.showExitStatus,
  };

  const storedPromptTheme = terminalConfig.promptTheme;
  const activePromptThemeId =
    storedPromptTheme === PROMPT_THEME_CUSTOM_ID
      ? PROMPT_THEME_CUSTOM_ID
      : (storedPromptTheme ?? getMatchingPromptThemeId(promptThemeConfig));
  const isOmpTheme =
    storedPromptTheme !== undefined && storedPromptTheme !== PROMPT_THEME_CUSTOM_ID;
  const promptThemePreset = isOmpTheme
    ? getPromptThemePreset(storedPromptTheme as TerminalPromptTheme)
    : null;

  const applyEnabledUpdate = (enabled: boolean) => {
    // Ensure all required fields are present
    const updatedConfig = {
      enabled,
      customPrompt: terminalConfig.customPrompt,
      promptFormat: terminalConfig.promptFormat,
      showGitBranch: terminalConfig.showGitBranch,
      showGitStatus: terminalConfig.showGitStatus,
      showUserHost: terminalConfig.showUserHost,
      showPath: terminalConfig.showPath,
      pathStyle: terminalConfig.pathStyle,
      pathDepth: terminalConfig.pathDepth,
      showTime: terminalConfig.showTime,
      showExitStatus: terminalConfig.showExitStatus,
      promptTheme: terminalConfig.promptTheme ?? PROMPT_THEME_CUSTOM_ID,
      customAliases: terminalConfig.customAliases,
      customEnvVars: terminalConfig.customEnvVars,
      rcFileVersion: TERMINAL_RC_FILE_VERSION,
    };

    updateGlobalSettings.mutate(
      { terminalConfig: updatedConfig },
      {
        onSuccess: () => {
          toast.success(
            enabled ? 'Custom terminal configs enabled' : 'Custom terminal configs disabled',
            {
              description: enabled
                ? 'New terminals will use custom prompts'
                : '.automaker/terminal/ will be cleaned up',
            }
          );
        },
        onError: (error) => {
          console.error('[TerminalConfig] Failed to update settings:', error);
          toast.error('Failed to update terminal config', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
        },
      }
    );
  };

  useEffect(() => {
    setLocalEnvVars(
      Object.entries(globalSettings?.terminalConfig?.customEnvVars || {}).map(([key, value]) =>
        createEnvVarEntry(key, value)
      )
    );
  }, [createEnvVarEntry, globalSettings?.terminalConfig?.customEnvVars]);

  useEffect(() => {
    return () => {
      if (envVarUpdateTimeoutRef.current) {
        clearTimeout(envVarUpdateTimeoutRef.current);
      }
    };
  }, []);

  const handleToggleEnabled = async (enabled: boolean) => {
    if (enabled) {
      setShowEnableConfirm(true);
      return;
    }

    applyEnabledUpdate(false);
  };

  const handleUpdateConfig = (updates: Partial<typeof terminalConfig>) => {
    const nextPromptTheme = updates.promptTheme ?? PROMPT_THEME_CUSTOM_ID;

    updateGlobalSettings.mutate(
      {
        terminalConfig: {
          ...terminalConfig,
          ...updates,
          promptTheme: nextPromptTheme,
        },
      },
      {
        onError: (error) => {
          console.error('[TerminalConfig] Failed to update settings:', error);
          toast.error('Failed to update terminal config', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
        },
      }
    );
  };

  const scheduleEnvVarsUpdate = (envVarsObject: Record<string, string>) => {
    if (envVarUpdateTimeoutRef.current) {
      clearTimeout(envVarUpdateTimeoutRef.current);
    }
    envVarUpdateTimeoutRef.current = setTimeout(() => {
      handleUpdateConfig({ customEnvVars: envVarsObject });
    }, ENV_VAR_UPDATE_DEBOUNCE_MS);
  };

  const handlePromptThemeChange = (themeId: string) => {
    if (themeId === PROMPT_THEME_CUSTOM_ID) {
      handleUpdateConfig({ promptTheme: PROMPT_THEME_CUSTOM_ID });
      return;
    }

    const preset = getPromptThemePreset(themeId as TerminalPromptTheme);
    if (!preset) {
      handleUpdateConfig({ promptTheme: PROMPT_THEME_CUSTOM_ID });
      return;
    }

    handleUpdateConfig({
      ...preset.config,
      promptTheme: preset.id,
    });
  };

  const addEnvVar = () => {
    setLocalEnvVars([...localEnvVars, createEnvVarEntry()]);
  };

  const removeEnvVar = (id: string) => {
    const newVars = localEnvVars.filter((envVar) => envVar.id !== id);
    setLocalEnvVars(newVars);

    // Update settings
    const envVarsObject = newVars.reduce(
      (acc, { key, value }) => {
        if (key) acc[key] = value;
        return acc;
      },
      {} as Record<string, string>
    );

    scheduleEnvVarsUpdate(envVarsObject);
  };

  const updateEnvVar = (id: string, field: 'key' | 'value', newValue: string) => {
    const newVars = localEnvVars.map((envVar) =>
      envVar.id === id ? { ...envVar, [field]: newValue } : envVar
    );
    setLocalEnvVars(newVars);

    // Validate and update settings (only if key is valid)
    const envVarsObject = newVars.reduce(
      (acc, { key, value }) => {
        // Only include vars with valid keys (alphanumeric + underscore)
        if (key && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    scheduleEnvVarsUpdate(envVarsObject);
  };

  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        'border border-border/50',
        'bg-gradient-to-br from-card/90 via-card/70 to-card/80 backdrop-blur-xl',
        'shadow-sm shadow-black/5'
      )}
    >
      <div className="p-6 border-b border-border/50 bg-gradient-to-r from-transparent via-purple-500/5 to-transparent">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 flex items-center justify-center border border-purple-500/20">
            <Wand2 className="w-5 h-5 text-purple-500" />
          </div>
          <h2 className="text-lg font-semibold text-foreground tracking-tight">
            Custom Terminal Configurations
          </h2>
        </div>
        <p className="text-sm text-muted-foreground/80 ml-12">
          Generate custom shell prompts that automatically sync with your app theme. Opt-in feature
          that creates configs in .automaker/terminal/ without modifying your existing RC files.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-foreground font-medium">Enable Custom Configurations</Label>
            <p className="text-xs text-muted-foreground">
              Create theme-synced shell configs in .automaker/terminal/
            </p>
          </div>
          <Switch checked={terminalConfig.enabled} onCheckedChange={handleToggleEnabled} />
        </div>

        {terminalConfig.enabled && (
          <>
            {/* Info Box */}
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3 flex gap-2">
              <Info className="h-4 w-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-foreground/80">
                <strong>How it works:</strong> Custom configs are applied to new terminals only.
                Your ~/.bashrc and ~/.zshrc are still loaded first. Close and reopen terminals to
                see changes.
              </div>
            </div>

            {/* Custom Prompt Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-foreground font-medium">Custom Prompt</Label>
                <p className="text-xs text-muted-foreground">
                  Override default shell prompt with themed version
                </p>
              </div>
              <Switch
                checked={terminalConfig.customPrompt}
                onCheckedChange={(checked) => handleUpdateConfig({ customPrompt: checked })}
              />
            </div>

            {terminalConfig.customPrompt && (
              <>
                {/* Prompt Format */}
                <div className="space-y-3">
                  <Label className="text-foreground font-medium">Prompt Theme (Oh My Posh)</Label>
                  <Select value={activePromptThemeId} onValueChange={handlePromptThemeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PROMPT_THEME_CUSTOM_ID}>
                        <div className="space-y-0.5">
                          <div>Custom</div>
                          <div className="text-xs text-muted-foreground">
                            Hand-tuned configuration
                          </div>
                        </div>
                      </SelectItem>
                      {PROMPT_THEME_PRESETS.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          <div className="space-y-0.5">
                            <div>{preset.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {preset.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {isOmpTheme && (
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex gap-2">
                    <Info className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-foreground/80">
                      <strong>{promptThemePreset?.label ?? 'Oh My Posh theme'}</strong> uses the
                      oh-my-posh CLI for rendering. Ensure it&apos;s installed for the full theme.
                      Prompt format and segment toggles are ignored while an OMP theme is selected.
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-foreground font-medium">Prompt Format</Label>
                  <Select
                    value={terminalConfig.promptFormat}
                    onValueChange={(value: 'standard' | 'minimal' | 'powerline' | 'starship') =>
                      handleUpdateConfig({ promptFormat: value })
                    }
                    disabled={isOmpTheme}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">
                        <div className="space-y-0.5">
                          <div>Standard</div>
                          <div className="text-xs text-muted-foreground">
                            [user@host] ~/path (main*) $
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="minimal">
                        <div className="space-y-0.5">
                          <div>Minimal</div>
                          <div className="text-xs text-muted-foreground">~/path (main*) $</div>
                        </div>
                      </SelectItem>
                      <SelectItem value="powerline">
                        <div className="space-y-0.5">
                          <div>Powerline</div>
                          <div className="text-xs text-muted-foreground">
                            ┌─[user@host]─[~/path]─[main*]
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="starship">
                        <div className="space-y-0.5">
                          <div>Starship-Inspired</div>
                          <div className="text-xs text-muted-foreground">
                            user@host in ~/path on main*
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Git Info Toggles */}
                <div className="space-y-4 pl-4 border-l-2 border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm">Show Git Branch</Label>
                    </div>
                    <Switch
                      checked={terminalConfig.showGitBranch}
                      onCheckedChange={(checked) => handleUpdateConfig({ showGitBranch: checked })}
                      disabled={isOmpTheme}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">*</span>
                      <Label className="text-sm">Show Git Status (dirty indicator)</Label>
                    </div>
                    <Switch
                      checked={terminalConfig.showGitStatus}
                      onCheckedChange={(checked) => handleUpdateConfig({ showGitStatus: checked })}
                      disabled={!terminalConfig.showGitBranch || isOmpTheme}
                    />
                  </div>
                </div>

                {/* Prompt Segments */}
                <div className="space-y-4 pl-4 border-l-2 border-border/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wand2 className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-sm">Show User & Host</Label>
                    </div>
                    <Switch
                      checked={terminalConfig.showUserHost}
                      onCheckedChange={(checked) => handleUpdateConfig({ showUserHost: checked })}
                      disabled={isOmpTheme}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">~/</span>
                      <Label className="text-sm">Show Path</Label>
                    </div>
                    <Switch
                      checked={terminalConfig.showPath}
                      onCheckedChange={(checked) => handleUpdateConfig({ showPath: checked })}
                      disabled={isOmpTheme}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">⏱</span>
                      <Label className="text-sm">Show Time</Label>
                    </div>
                    <Switch
                      checked={terminalConfig.showTime}
                      onCheckedChange={(checked) => handleUpdateConfig({ showTime: checked })}
                      disabled={isOmpTheme}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">✗</span>
                      <Label className="text-sm">Show Exit Status</Label>
                    </div>
                    <Switch
                      checked={terminalConfig.showExitStatus}
                      onCheckedChange={(checked) => handleUpdateConfig({ showExitStatus: checked })}
                      disabled={isOmpTheme}
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Path Style</Label>
                      <Select
                        value={terminalConfig.pathStyle}
                        onValueChange={(value: 'full' | 'short' | 'basename') =>
                          handleUpdateConfig({ pathStyle: value })
                        }
                        disabled={!terminalConfig.showPath || isOmpTheme}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Full</SelectItem>
                          <SelectItem value="short">Short</SelectItem>
                          <SelectItem value="basename">Basename</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Path Depth</Label>
                      <Input
                        type="number"
                        min={PATH_DEPTH_MIN}
                        max={PATH_DEPTH_MAX}
                        value={terminalConfig.pathDepth}
                        onChange={(event) =>
                          handleUpdateConfig({
                            pathDepth: clampPathDepth(Number(event.target.value) || 0),
                          })
                        }
                        disabled={!terminalConfig.showPath || isOmpTheme}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-3">
                  <Label className="text-foreground font-medium">Preview</Label>
                  <PromptPreview
                    format={terminalConfig.promptFormat}
                    theme={theme}
                    showGitBranch={terminalConfig.showGitBranch}
                    showGitStatus={terminalConfig.showGitStatus}
                    showUserHost={terminalConfig.showUserHost}
                    showPath={terminalConfig.showPath}
                    pathStyle={terminalConfig.pathStyle}
                    pathDepth={terminalConfig.pathDepth}
                    showTime={terminalConfig.showTime}
                    showExitStatus={terminalConfig.showExitStatus}
                    isOmpTheme={isOmpTheme}
                    promptThemeLabel={promptThemePreset?.label}
                  />
                </div>
              </>
            )}

            {/* Custom Aliases */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-foreground font-medium">Custom Aliases</Label>
                <p className="text-xs text-muted-foreground">
                  Add shell aliases (one per line, e.g., alias ll='ls -la')
                </p>
              </div>
              <Textarea
                value={terminalConfig.customAliases}
                onChange={(e) => handleUpdateConfig({ customAliases: e.target.value })}
                placeholder="# Custom aliases&#10;alias gs='git status'&#10;alias ll='ls -la'&#10;alias ..='cd ..'"
                className="font-mono text-sm h-32"
              />
            </div>

            {/* Custom Environment Variables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-foreground font-medium">
                    Custom Environment Variables
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Add custom env vars (alphanumeric + underscore only)
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={addEnvVar} className="h-8 gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>

              {localEnvVars.length > 0 && (
                <div className="space-y-2">
                  {localEnvVars.map((envVar) => (
                    <div key={envVar.id} className="flex gap-2 items-start">
                      <Input
                        value={envVar.key}
                        onChange={(e) => updateEnvVar(envVar.id, 'key', e.target.value)}
                        placeholder="VAR_NAME"
                        className={cn(
                          'font-mono text-sm flex-1',
                          envVar.key &&
                            !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(envVar.key) &&
                            'border-destructive'
                        )}
                      />
                      <Input
                        value={envVar.value}
                        onChange={(e) => updateEnvVar(envVar.id, 'value', e.target.value)}
                        placeholder="value"
                        className="font-mono text-sm flex-[2]"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEnvVar(envVar.id)}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={showEnableConfirm}
        onOpenChange={setShowEnableConfirm}
        title="Enable custom terminal configurations"
        description="Automaker will generate per-project shell configuration files for your terminal."
        icon={Info}
        confirmText="Enable"
        onConfirm={() => applyEnabledUpdate(true)}
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <ul className="list-disc space-y-1 pl-5">
            <li>Creates shell config files in `.automaker/terminal/`</li>
            <li>Applies prompts and colors that match your app theme</li>
            <li>Leaves your existing `~/.bashrc` and `~/.zshrc` untouched</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            New terminal sessions will use the custom prompt; existing sessions are unchanged.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
