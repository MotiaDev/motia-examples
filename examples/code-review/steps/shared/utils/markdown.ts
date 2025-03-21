import MarkdownIt from 'markdown-it';

// Initialize markdown parser with default options
const md = new MarkdownIt({
  html: false,  // Don't allow HTML tags in markdown for security
  linkify: true, // Auto-convert URL-like text to links
  typographer: true, // Enable some language-neutral replacement + quotes beautification
});

/**
 * Converts markdown to HTML
 * @param markdown The markdown text to convert
 * @returns HTML string
 */
export function markdownToHtml(markdown: string): string {
  return md.render(markdown);
}

/**
 * Creates a formatted markdown table
 * @param headers Table headers
 * @param rows Table data rows
 * @returns Markdown table as string
 */
export function createMarkdownTable(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
  
  const dataRows = rows.map(row => `| ${row.join(' | ')} |`);
  
  return [headerRow, separatorRow, ...dataRows].join('\n');
}

/**
 * Formats a code block with language syntax highlighting
 * @param code Code content
 * @param language Programming language for syntax highlighting
 * @returns Markdown code block
 */
export function formatCodeBlock(code: string, language = 'typescript'): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

/**
 * Creates a bulleted list from array of items
 * @param items List items
 * @returns Markdown bulleted list
 */
export function createBulletList(items: string[]): string {
  return items.map(item => `- ${item}`).join('\n');
}

/**
 * Creates a numbered list from array of items
 * @param items List items
 * @returns Markdown numbered list
 */
export function createNumberedList(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

/**
 * Creates a simple document structure with sections
 * @param title Document title
 * @param sections Array of {heading, content} objects
 * @returns Complete markdown document
 */
export function createDocument(title: string, sections: Array<{heading: string, content: string}>): string {
  const lines: string[] = [];
  
  // Add title
  lines.push(`# ${title}`);
  lines.push('');
  
  // Add timestamp
  lines.push(`*Generated on: ${new Date().toLocaleString()}*`);
  lines.push('');
  
  // Add each section
  sections.forEach(section => {
    lines.push(`## ${section.heading}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');
  });
  
  return lines.join('\n');
} 