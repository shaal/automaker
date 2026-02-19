import ReactMarkdown, { Components } from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { Square, CheckSquare } from 'lucide-react';

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Renders a tasks code block as a proper task list with checkboxes
 */
function TasksBlock({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="my-4 space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Check for phase/section headers (## Phase 1: ...)
        const headerMatch = trimmed.match(/^##\s+(.+)$/);
        if (headerMatch) {
          return (
            <div key={idx} className="text-foreground font-semibold mt-4 mb-2 text-sm">
              {headerMatch[1]}
            </div>
          );
        }

        // Check for task items (- [ ] or - [x])
        const taskMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.+)$/);
        if (taskMatch) {
          const isChecked = taskMatch[1].toLowerCase() === 'x';
          const taskText = taskMatch[2];

          return (
            <div key={idx} className="flex items-start gap-2 py-1">
              {isChecked ? (
                <CheckSquare className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <span
                className={cn(
                  'text-sm',
                  isChecked ? 'text-muted-foreground line-through' : 'text-foreground-secondary'
                )}
              >
                {taskText}
              </span>
            </div>
          );
        }

        // Empty lines
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Other content (render as-is)
        return (
          <div key={idx} className="text-sm text-foreground-secondary">
            {trimmed}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Custom components for ReactMarkdown
 */
const markdownComponents: Components = {
  // Handle code blocks - special case for 'tasks' language
  code({ className, children }) {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const content = String(children).replace(/\n$/, '');

    // Special handling for tasks code blocks
    if (language === 'tasks') {
      return <TasksBlock content={content} />;
    }

    // Regular code (inline or block)
    return <code className={className}>{children}</code>;
  },
};

/**
 * Reusable Markdown component for rendering markdown content
 * Theme-aware styling that adapts to all predefined themes
 * Supports raw HTML elements including images
 */
export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        'prose prose-sm prose-invert max-w-none',
        // Headings
        '[&_h1]:text-xl [&_h1]:text-foreground [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2',
        '[&_h2]:text-lg [&_h2]:text-foreground [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2',
        '[&_h3]:text-base [&_h3]:text-foreground [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
        '[&_h4]:text-sm [&_h4]:text-foreground [&_h4]:font-semibold [&_h4]:mt-2 [&_h4]:mb-1',
        // Paragraphs
        '[&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:my-2',
        // Lists
        '[&_ul]:my-2 [&_ul]:pl-4 [&_ol]:my-2 [&_ol]:pl-4',
        '[&_li]:text-foreground-secondary [&_li]:my-0.5',
        // Code
        '[&_code]:text-chart-2 [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm',
        '[&_pre]:bg-card [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:my-2 [&_pre]:p-3 [&_pre]:overflow-x-auto',
        '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
        // Strong/Bold
        '[&_strong]:text-foreground [&_strong]:font-semibold',
        // Links
        '[&_a]:text-brand-500 [&_a]:no-underline hover:[&_a]:underline',
        // Blockquotes
        '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic [&_blockquote]:my-2',
        // Horizontal rules
        '[&_hr]:border-border [&_hr]:my-4',
        // Images
        '[&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2 [&_img]:border [&_img]:border-border',
        // Tables
        '[&_table]:w-full [&_table]:border-collapse [&_table]:my-4',
        '[&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-foreground [&_th]:font-semibold',
        '[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-foreground-secondary',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={markdownComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
