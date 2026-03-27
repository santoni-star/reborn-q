import { marked } from 'marked';
import Prism from 'prismjs';

// Import common languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';

const renderer = new marked.Renderer();

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
    console.warn('Prism highlighting failed in utils:', e);
  }

  return `<pre class="language-${lang || 'javascript'}"><code class="language-${lang || 'javascript'}">${highlightedCode}</code></pre>`;
};

marked.setOptions({
  renderer,
  gfm: true,
  breaks: false
});

export const parseMarkdown = (text: string): string => {
  return marked.parse(text) as string;
};
