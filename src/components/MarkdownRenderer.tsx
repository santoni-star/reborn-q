import React from 'react';
import { clsx } from 'clsx';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import Prism from 'prismjs';

// Import Prism components
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';

// Configure marked to use Prism for syntax highlighting
const renderer = new marked.Renderer();

// Override heading rendering
renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
  return `<h${depth} class="text-${depth === 1 ? '2xl' : depth === 2 ? 'xl' : 'lg'} font-bold text-white mt-6 mb-3">${text}</h${depth}>`;
};

// Override list rendering
renderer.list = ({ items, ordered }: { items: any[]; ordered: boolean }) => {
  const tag = ordered ? 'ol' : 'ul';
  const listItems = items.map(item => `<li class="ml-4 my-2">${item.text}</li>`).join('');
  return `<${tag} class="list-${ordered ? 'decimal' : 'disc'} list-inside my-4">${listItems}</${tag}>`;
};

// Override paragraph rendering
renderer.paragraph = ({ text }: { text: string }) => {
  return `<p class="my-3 leading-relaxed">${text}</p>`;
};

// Override code block rendering to use Prism highlighting
renderer.code = ({ text, lang: infoString }: { text: string; lang?: string }) => {
  let lang = '';
  if (infoString) {
    lang = infoString.split(/\s+/)[0];
  }

  let highlightedCode = text;
  try {
    if (lang && Prism.languages[lang]) {
      highlightedCode = Prism.highlight(text, Prism.languages[lang], lang);
    } else {
      highlightedCode = Prism.highlight(text, Prism.languages.javascript, 'javascript');
    }
  } catch (e) {
    console.warn('Prism highlighting failed:', e);
    highlightedCode = text;
  }

  return `<pre class="bg-zinc-800/50 rounded-lg p-4 my-4 overflow-x-auto"><code class="language-${lang || 'javascript'}">${highlightedCode}</code></pre>`;
};

// Override blockquote rendering
renderer.blockquote = ({ text }: { text: string }) => {
  return `<blockquote class="border-l-4 border-indigo-500 pl-4 my-4 italic text-zinc-400">${text}</blockquote>`;
};

// Override hr rendering
renderer.hr = () => {
  return `<hr class="my-6 border-zinc-700" />`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: true,
});

interface MarkdownRendererProps {
  markdownText: string;
  className?: string;
  searchQuery?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps & { fullContent?: boolean }> = ({
  markdownText,
  className = '',
  searchQuery = '',
  fullContent = false
}) => {
  if (!markdownText) return null;

  let processedText = markdownText;

  if (searchQuery.trim().length >= 2) {
    const words = searchQuery.split(/\s+/).filter(w => w.length >= 2);
    words.forEach(word => {
      try {
        const regex = new RegExp(`(${word})`, 'gi');
        processedText = processedText.replace(regex, '==$1==');
      } catch (error) {
        console.warn('Markdown parsing error:', error);
      }
    });
  }

  let sanitizedHtml = '';
  try {
    const rawHtml = marked.parse(processedText) as string;
    sanitizedHtml = DOMPurify.sanitize(rawHtml);
    sanitizedHtml = sanitizedHtml.replace(/==([\s\S]*?)==/g, '<mark class="bg-primary/30 text-foreground px-0.5 rounded-sm">$1</mark>');
  } catch (e) {
    console.error('Markdown parsing failed:', e);
    sanitizedHtml = markdownText;
  }

  return (
    <div
      className={clsx(
        "font-sans leading-relaxed opacity-90 prose prose-invert max-w-none",
        !fullContent && "line-clamp-4 overflow-hidden",
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default MarkdownRenderer;