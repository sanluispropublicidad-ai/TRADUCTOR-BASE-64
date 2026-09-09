'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

interface MarkdownViewerProps {
  content: string;
  isStreaming?: boolean;
  viewMode?: 'rendered' | 'raw';
}

export function MarkdownViewer({ content, isStreaming = false, viewMode = 'rendered' }: MarkdownViewerProps) {
  if (!content) return null;

  if (viewMode === 'raw') {
    return (
      <div className="w-full h-full font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap select-text selection:bg-zinc-200 dark:selection:bg-zinc-800">
        {content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-4 ml-0.5 bg-zinc-700 dark:bg-zinc-300 animate-pulse align-middle" />
        )}
      </div>
    );
  }

  return (
    <div className="markdown-viewer w-full text-zinc-900 dark:text-zinc-100 text-sm md:text-base leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const rawContent = String(children).replace(/\n$/, '');
            const isMultiline = String(children).includes('\n');

            if (match || isMultiline) {
              return <CodeBlock language={match ? match[1] : ''} value={rawContent} />;
            }
            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60"
                {...props}
              >
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white mt-6 mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg md:text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 mt-5 mb-2.5">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base md:text-lg font-medium tracking-tight text-zinc-900 dark:text-zinc-200 mt-4 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 leading-relaxed text-zinc-800 dark:text-zinc-300">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1 text-zinc-800 dark:text-zinc-300">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-zinc-800 dark:text-zinc-300">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-zinc-400 dark:border-zinc-600 pl-3.5 my-3 italic text-zinc-600 dark:text-zinc-400">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-5 border-zinc-200 dark:border-zinc-800" />,
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-zinc-200 dark:border-zinc-800 rounded-lg">
              <table className="w-full text-xs text-left text-zinc-700 dark:text-zinc-300">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2 font-medium border-b border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/60">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-1 bg-zinc-700 dark:bg-zinc-300 animate-pulse align-middle" />
      )}
    </div>
  );
}
