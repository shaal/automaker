'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { Markdown } from '@/components/ui/markdown';
import { cn } from '@/lib/utils';

interface ToolCall {
  tool: string;
  input: string;
}

interface ParsedPlanContent {
  toolCalls: ToolCall[];
  planMarkdown: string;
}

/**
 * Parses plan content to separate tool calls from the actual plan/specification markdown.
 * Tool calls appear at the beginning (exploration phase), followed by the plan markdown.
 */
function parsePlanContent(content: string): ParsedPlanContent {
  const lines = content.split('\n');
  const toolCalls: ToolCall[] = [];
  let planStartIndex = -1;

  let currentTool: string | null = null;
  let currentInput: string[] = [];
  let inJsonBlock = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if this line starts the actual plan/spec (markdown heading)
    // Plans typically start with # or ## headings
    if (
      !inJsonBlock &&
      (trimmed.match(/^#{1,3}\s+\S/) || // Markdown headings (including emoji like ## ✅ Plan)
        trimmed.startsWith('---') || // Horizontal rule often used as separator
        trimmed.match(/^\*\*\S/)) // Bold text starting a section
    ) {
      // Flush any active tool call before starting the plan
      if (currentTool && currentInput.length > 0) {
        toolCalls.push({
          tool: currentTool,
          input: currentInput.join('\n').trim(),
        });
        currentTool = null;
        currentInput = [];
      }
      planStartIndex = i;
      break;
    }

    // Detect tool call start (supports tool names with dots/hyphens like web.run, file-read)
    const toolMatch = trimmed.match(/^(?:🔧\s*)?Tool:\s*([^\s]+)/i);
    if (toolMatch && !inJsonBlock) {
      // Save previous tool call if exists
      if (currentTool && currentInput.length > 0) {
        toolCalls.push({
          tool: currentTool,
          input: currentInput.join('\n').trim(),
        });
      }
      currentTool = toolMatch[1];
      currentInput = [];
      continue;
    }

    // Detect Input: line
    if (trimmed.startsWith('Input:') && currentTool) {
      const inputContent = trimmed.replace(/^Input:\s*/, '');
      if (inputContent) {
        currentInput.push(inputContent);
        // Check if JSON starts
        if (inputContent.includes('{')) {
          braceDepth =
            (inputContent.match(/\{/g) || []).length - (inputContent.match(/\}/g) || []).length;
          inJsonBlock = braceDepth > 0;
        }
      }
      continue;
    }

    // If we're collecting input for a tool
    if (currentTool) {
      if (inJsonBlock) {
        currentInput.push(line);
        braceDepth += (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
        if (braceDepth <= 0) {
          inJsonBlock = false;
          // Save tool call
          toolCalls.push({
            tool: currentTool,
            input: currentInput.join('\n').trim(),
          });
          currentTool = null;
          currentInput = [];
        }
      } else if (trimmed.startsWith('{')) {
        // JSON block starting
        currentInput.push(line);
        braceDepth = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
        inJsonBlock = braceDepth > 0;
        if (!inJsonBlock) {
          // Single-line JSON
          toolCalls.push({
            tool: currentTool,
            input: currentInput.join('\n').trim(),
          });
          currentTool = null;
          currentInput = [];
        }
      } else if (trimmed === '') {
        // Empty line might end the tool call section
        if (currentInput.length > 0) {
          toolCalls.push({
            tool: currentTool,
            input: currentInput.join('\n').trim(),
          });
          currentTool = null;
          currentInput = [];
        }
      }
    }
  }

  // Save any remaining tool call
  if (currentTool && currentInput.length > 0) {
    toolCalls.push({
      tool: currentTool,
      input: currentInput.join('\n').trim(),
    });
  }

  // Extract plan markdown
  let planMarkdown = '';
  if (planStartIndex >= 0) {
    planMarkdown = lines.slice(planStartIndex).join('\n').trim();
  } else if (toolCalls.length === 0) {
    // No tool calls found, treat entire content as markdown
    planMarkdown = content.trim();
  }

  return { toolCalls, planMarkdown };
}

interface PlanContentViewerProps {
  content: string;
  className?: string;
}

export function PlanContentViewer({ content, className }: PlanContentViewerProps) {
  const [showToolCalls, setShowToolCalls] = useState(false);

  const { toolCalls, planMarkdown } = useMemo(() => parsePlanContent(content), [content]);

  if (!content || !content.trim()) {
    return (
      <div className={cn('text-muted-foreground text-center py-8', className)}>
        No plan content available.
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Tool Calls Section - Collapsed by default */}
      {toolCalls.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setShowToolCalls(!showToolCalls)}
            className="w-full px-4 py-2 flex items-center gap-2 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          >
            {showToolCalls ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Exploration ({toolCalls.length} tool call{toolCalls.length !== 1 ? 's' : ''})
            </span>
          </button>

          {showToolCalls && (
            <div className="p-3 space-y-2 bg-muted/10 max-h-[300px] overflow-y-auto">
              {toolCalls.map((tc, idx) => (
                <div key={idx} className="text-xs font-mono">
                  <div className="text-cyan-400 mb-1">Tool: {tc.tool}</div>
                  <pre className="bg-muted/50 rounded p-2 overflow-x-auto text-foreground-secondary whitespace-pre-wrap">
                    {tc.input}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plan/Specification Content - Main focus */}
      {planMarkdown ? (
        <div className="min-h-[200px]">
          <Markdown>{planMarkdown}</Markdown>
        </div>
      ) : toolCalls.length > 0 ? (
        <div className="text-muted-foreground text-center py-8 border border-dashed border-border rounded-lg">
          <p className="text-sm">No specification content found.</p>
          <p className="text-xs mt-1">The plan appears to only contain exploration tool calls.</p>
        </div>
      ) : null}
    </div>
  );
}
