import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

interface MarkdownMessageProps {
  content: string;
  className?: string;
}

export function MarkdownMessage({ content, className = '' }: MarkdownMessageProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          // Custom styling for different markdown elements
          h1: ({ children }) => (
            <h1 className="text-xl font-bold mb-3 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-md font-medium mb-2 text-gray-900 dark:text-white">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-3 last:mb-0 text-gray-800 dark:text-gray-200 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 text-gray-800 dark:text-gray-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-800 dark:text-gray-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="ml-2 text-gray-800 dark:text-gray-200">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-3 bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300 italic">
              {children}
            </blockquote>
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: (props: any) => {
            const { inline, className, children, ...otherProps } = props;
            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : '';
            
            if (inline) {
              return (
                <code 
                  className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded text-sm font-mono"
                  {...otherProps}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <div className="mb-3">
                {language && (
                  <div className="bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 rounded-t border-b border-gray-300 dark:border-gray-600">
                    {language}
                  </div>
                )}
                <pre className={`${language ? 'rounded-t-none' : 'rounded'} bg-gray-900 dark:bg-gray-800 p-4 overflow-x-auto`}>
                  <code className={`text-gray-100 text-sm font-mono ${className}`} {...otherProps}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },
          pre: ({ children }) => (
            <div className="mb-3">
              {children}
            </div>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-800 dark:text-gray-200">
              {children}
            </em>
          ),
          a: ({ href, children }) => (
            <a 
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border border-gray-200 dark:border-gray-700 rounded-lg">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-50 dark:bg-gray-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-4 border-gray-200 dark:border-gray-700" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
