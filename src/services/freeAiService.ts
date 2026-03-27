import type { Note } from '../types/entities';

export const freeAiService = {
  async processNote({ content }: { content: string, context?: string, masterContext?: string }): Promise<{
    title: string;
    formattedContent: string;
    type: 'idea' | 'bug' | 'architecture' | 'todo' | 'generic';
    tags: string[];
    color?: string;
  }> {
    const safeContent = typeof content === 'string' ? content : String(content || '');
    // Placeholder for a free AI service implementation
    // For now, it just returns a generic structure
    return {
      title: safeContent.slice(0, 20) + (safeContent.length > 20 ? '...' : ''),
      formattedContent: safeContent,
      type: 'generic',
      tags: [],
      color: 'bg-zinc-900/95 border-white/20 text-zinc-100'
    };
  },

  async generateReport(notes: Note[], isGlobal: boolean): Promise<string> {
    return `Free AI Report (${isGlobal ? 'Global' : 'Project'}): Generated for ${notes.length} notes. (Placeholder)`;
  }
};
