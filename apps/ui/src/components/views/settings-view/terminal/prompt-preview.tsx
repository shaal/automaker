/**
 * Prompt Preview - Shows a live preview of the custom terminal prompt
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@automaker/types';
import { getTerminalTheme } from '@/config/terminal-themes';

interface PromptPreviewProps {
  format: 'standard' | 'minimal' | 'powerline' | 'starship';
  theme: ThemeMode;
  showGitBranch: boolean;
  showGitStatus: boolean;
  showUserHost: boolean;
  showPath: boolean;
  pathStyle: 'full' | 'short' | 'basename';
  pathDepth: number;
  showTime: boolean;
  showExitStatus: boolean;
  isOmpTheme?: boolean;
  promptThemeLabel?: string;
  className?: string;
}

export function PromptPreview({
  format,
  theme,
  showGitBranch,
  showGitStatus,
  showUserHost,
  showPath,
  pathStyle,
  pathDepth,
  showTime,
  showExitStatus,
  isOmpTheme = false,
  promptThemeLabel,
  className,
}: PromptPreviewProps) {
  const terminalTheme = getTerminalTheme(theme);

  const formatPath = (inputPath: string) => {
    let displayPath = inputPath;
    let prefix = '';

    if (displayPath.startsWith('~/')) {
      prefix = '~/';
      displayPath = displayPath.slice(2);
    } else if (displayPath.startsWith('/')) {
      prefix = '/';
      displayPath = displayPath.slice(1);
    }

    const segments = displayPath.split('/').filter((segment) => segment.length > 0);
    const depth = Math.max(0, pathDepth);
    const trimmedSegments = depth > 0 ? segments.slice(-depth) : segments;

    let formattedSegments = trimmedSegments;
    if (pathStyle === 'basename' && trimmedSegments.length > 0) {
      formattedSegments = [trimmedSegments[trimmedSegments.length - 1]];
    } else if (pathStyle === 'short') {
      formattedSegments = trimmedSegments.map((segment, index) => {
        if (index < trimmedSegments.length - 1) {
          return segment.slice(0, 1);
        }
        return segment;
      });
    }

    const joined = formattedSegments.join('/');
    if (prefix === '/' && joined.length === 0) {
      return '/';
    }
    if (prefix === '~/' && joined.length === 0) {
      return '~';
    }
    return `${prefix}${joined}`;
  };

  // Generate preview text based on format
  const renderPrompt = () => {
    if (isOmpTheme) {
      return (
        <div className="font-mono text-sm leading-relaxed space-y-2">
          <div style={{ color: terminalTheme.magenta }}>
            {promptThemeLabel ?? 'Oh My Posh theme'}
          </div>
          <div className="text-xs text-muted-foreground">
            Rendered by the oh-my-posh CLI in the terminal.
          </div>
          <div className="text-xs text-muted-foreground">
            Preview here stays generic to avoid misleading output.
          </div>
        </div>
      );
    }

    const user = 'user';
    const host = 'automaker';
    const path = formatPath('~/projects/automaker');
    const branch = showGitBranch ? 'main' : null;
    const dirty = showGitStatus && showGitBranch ? '*' : '';
    const time = showTime ? '[14:32]' : '';
    const status = showExitStatus ? '✗ 1' : '';

    const gitInfo = branch ? ` (${branch}${dirty})` : '';

    switch (format) {
      case 'minimal': {
        return (
          <div className="font-mono text-sm leading-relaxed">
            {showTime && <span style={{ color: terminalTheme.magenta }}>{time} </span>}
            {showUserHost && (
              <span style={{ color: terminalTheme.cyan }}>
                {user}
                <span style={{ color: terminalTheme.foreground }}>@</span>
                <span style={{ color: terminalTheme.blue }}>{host}</span>{' '}
              </span>
            )}
            {showPath && <span style={{ color: terminalTheme.yellow }}>{path}</span>}
            {gitInfo && <span style={{ color: terminalTheme.magenta }}>{gitInfo}</span>}
            {showExitStatus && <span style={{ color: terminalTheme.red }}> {status}</span>}
            <span style={{ color: terminalTheme.green }}> $</span>
            <span className="ml-1 animate-pulse">▊</span>
          </div>
        );
      }

      case 'powerline': {
        const powerlineSegments: ReactNode[] = [];
        if (showUserHost) {
          powerlineSegments.push(
            <span key="user-host" style={{ color: terminalTheme.cyan }}>
              [{user}
              <span style={{ color: terminalTheme.foreground }}>@</span>
              <span style={{ color: terminalTheme.blue }}>{host}</span>]
            </span>
          );
        }
        if (showPath) {
          powerlineSegments.push(
            <span key="path" style={{ color: terminalTheme.yellow }}>
              [{path}]
            </span>
          );
        }
        const powerlineCore = powerlineSegments.flatMap((segment, index) =>
          index === 0
            ? [segment]
            : [
                <span key={`sep-${index}`} style={{ color: terminalTheme.cyan }}>
                  ─
                </span>,
                segment,
              ]
        );
        const powerlineExtras: ReactNode[] = [];
        if (gitInfo) {
          powerlineExtras.push(
            <span key="git" style={{ color: terminalTheme.magenta }}>
              {gitInfo}
            </span>
          );
        }
        if (showTime) {
          powerlineExtras.push(
            <span key="time" style={{ color: terminalTheme.magenta }}>
              {time}
            </span>
          );
        }
        if (showExitStatus) {
          powerlineExtras.push(
            <span key="status" style={{ color: terminalTheme.red }}>
              {status}
            </span>
          );
        }
        const powerlineLine: ReactNode[] = [...powerlineCore];
        if (powerlineExtras.length > 0) {
          if (powerlineLine.length > 0) {
            powerlineLine.push(' ');
          }
          powerlineLine.push(...powerlineExtras);
        }

        return (
          <div className="font-mono text-sm leading-relaxed space-y-1">
            <div>
              <span style={{ color: terminalTheme.cyan }}>┌─</span>
              {powerlineLine}
            </div>
            <div>
              <span style={{ color: terminalTheme.cyan }}>└─</span>
              <span style={{ color: terminalTheme.green }}>$</span>
              <span className="ml-1 animate-pulse">▊</span>
            </div>
          </div>
        );
      }

      case 'starship': {
        return (
          <div className="font-mono text-sm leading-relaxed space-y-1">
            <div>
              {showTime && <span style={{ color: terminalTheme.magenta }}>{time} </span>}
              {showUserHost && (
                <>
                  <span style={{ color: terminalTheme.cyan }}>{user}</span>
                  <span style={{ color: terminalTheme.foreground }}>@</span>
                  <span style={{ color: terminalTheme.blue }}>{host}</span>
                </>
              )}
              {showPath && (
                <>
                  <span style={{ color: terminalTheme.foreground }}> in </span>
                  <span style={{ color: terminalTheme.yellow }}>{path}</span>
                </>
              )}
              {branch && (
                <>
                  <span style={{ color: terminalTheme.foreground }}> on </span>
                  <span style={{ color: terminalTheme.magenta }}>
                    {branch}
                    {dirty}
                  </span>
                </>
              )}
              {showExitStatus && <span style={{ color: terminalTheme.red }}> {status}</span>}
            </div>
            <div>
              <span style={{ color: terminalTheme.green }}>❯</span>
              <span className="ml-1 animate-pulse">▊</span>
            </div>
          </div>
        );
      }

      case 'standard':
      default: {
        return (
          <div className="font-mono text-sm leading-relaxed">
            {showTime && <span style={{ color: terminalTheme.magenta }}>{time} </span>}
            {showUserHost && (
              <>
                <span style={{ color: terminalTheme.cyan }}>[{user}</span>
                <span style={{ color: terminalTheme.foreground }}>@</span>
                <span style={{ color: terminalTheme.blue }}>{host}</span>
                <span style={{ color: terminalTheme.cyan }}>]</span>
              </>
            )}
            {showPath && <span style={{ color: terminalTheme.yellow }}> {path}</span>}
            {gitInfo && <span style={{ color: terminalTheme.magenta }}>{gitInfo}</span>}
            {showExitStatus && <span style={{ color: terminalTheme.red }}> {status}</span>}
            <span style={{ color: terminalTheme.green }}> $</span>
            <span className="ml-1 animate-pulse">▊</span>
          </div>
        );
      }
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        'bg-[var(--terminal-bg)] text-[var(--terminal-fg)]',
        'shadow-inner',
        className
      )}
      style={
        {
          '--terminal-bg': terminalTheme.background,
          '--terminal-fg': terminalTheme.foreground,
        } as React.CSSProperties
      }
    >
      <div className="mb-2 text-xs text-muted-foreground opacity-70">Preview</div>
      {renderPrompt()}
    </div>
  );
}
