import React, { lazy, Suspense } from 'react';

const MarkdownRendererComponent = lazy(() => 
  import('./MarkdownRenderer').catch(err => {
    if (err.message?.includes('Failed to fetch dynamically imported module') || err.message?.includes('Loading chunk')) {
      const hasReloaded = sessionStorage.getItem('chunk-retry-reloaded');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk-retry-reloaded', 'true');
        window.location.reload();
      }
    }
    throw err;
  })
);

interface LazyMarkdownRendererProps {
  markdownText: string;
  className?: string;
  searchQuery?: string;
  fullContent?: boolean;
}

export const LazyMarkdownRenderer: React.FC<LazyMarkdownRendererProps> = ({
  markdownText,
  className = '',
  searchQuery = '',
  fullContent = false
}) => {
  return (
    <Suspense fallback={<div className={`font-sans leading-relaxed opacity-80 overflow-hidden prose prose-invert max-w-none ${className}`} style={{ minHeight: '60px' }}>
      <div className="animate-pulse space-y-2">
        <div className="h-2 bg-muted rounded w-full"></div>
        <div className="h-2 bg-muted rounded w-5/6"></div>
        <div className="h-2 bg-muted rounded w-4/6"></div>
      </div>
    </div>}>
      <MarkdownRendererComponent markdownText={markdownText} className={className} searchQuery={searchQuery} fullContent={fullContent} />
    </Suspense>
  );
};

export default LazyMarkdownRenderer;