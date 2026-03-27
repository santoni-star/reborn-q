export type NoteType = 'idea' | 'bug' | 'architecture' | 'todo' | 'generic';

export interface Note {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: NoteType;
  tags: string[];
  color?: string;
  completed?: boolean;
  createdAt: number;
  updatedAt: number;
  
  // Sync metadata
  isDirty: boolean;
  lastSyncedAt?: number;
  syncStatus?: 'synced' | 'pending' | 'error';
  version: number;
}

export const createNote = (
  title: string, 
  content: string, 
  projectId: string = '1', 
  type: NoteType = 'generic'
): Note => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
  projectId,
  title,
  content,
  type,
  tags: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isDirty: true,
  version: 1
});

export const getMostRecentNote = (a: Note, b: Note): Note => {
  if (a.version > b.version) return a;
  if (b.version > a.version) return b;
  return a.updatedAt >= b.updatedAt ? a : b;
};
