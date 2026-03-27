import type { StateCreator } from 'zustand';
import type { Note, Project } from '../../types/entities';
import db from '../../services/db';

export interface DataSlice {
  notes: Note[];
  projects: Project[];
  activeProjectId: string | null;
  searchQuery: string;
  searchCache: Record<string, Note[]>;
  isLoading: boolean;
  isProcessing: boolean;

  setNotes: (notes: Note[]) => void;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  loadInitialData: () => Promise<void>;
  addNote: (note: Note) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note | undefined>;
  deleteNote: (id: string) => Promise<void>;
  toggleNoteCompleted: (id: string) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const createDataSlice: StateCreator<DataSlice> = (set, get) => ({
  notes: [],
  projects: [],
  activeProjectId: '1',
  searchQuery: '',
  searchCache: {},
  isLoading: true,
  isProcessing: false,

  setNotes: (notes) => set({ notes, searchCache: {} }),
  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => set({ activeProjectId: id }),

  setSearchQuery: (searchQuery) => {
    const query = searchQuery.toLowerCase().trim();
    
    if (query === '') {
      set({ searchQuery: '', searchCache: {} });
      return;
    }

    // Check cache first
    const cachedResults = get().searchCache[query];
    if (cachedResults) {
      set({ searchQuery });
      return;
    }

    // Perform optimized search
    const startTime = performance.now();
    const allNotes = get().notes;

    const filteredNotes = allNotes.filter(note => {
      const lowerTitle = (note.title || '').toLowerCase();
      const lowerContent = (note.content || '').toLowerCase();
      const hasMatchingTag = note.tags && note.tags.some(tag =>
        (tag || '').toLowerCase().includes(query)
      );

      return lowerTitle.includes(query) || lowerContent.includes(query) || hasMatchingTag;
    });

    // Update cache
    const newCache = { ...get().searchCache };
    newCache[query] = filteredNotes;

    // Limit cache size (LRU-ish)
    if (Object.keys(newCache).length > 50) {
      const keys = Object.keys(newCache);
      for (let i = 0; i < 10; i++) delete newCache[keys[i]];
    }

    set({ searchQuery, searchCache: newCache });

    const duration = performance.now() - startTime;
    if (duration > 10) {
      console.log(`[Search] Took ${Math.round(duration)}ms for "${query}"`);
    }
  },

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      const [notes, projects, dbSettings] = await Promise.all([
        db.notes.toArray(),
        db.projects.toArray(),
        db.getSettings()
      ]);

      set({
        notes: notes.sort((a, b) => b.createdAt - a.createdAt),
        projects: projects.length > 0 ? projects : [{ id: '1', name: 'Inbox', createdAt: Date.now(), updatedAt: Date.now() }],
        settings: dbSettings ? { ...(get() as any).settings, ...dbSettings } : (get() as any).settings,
        isLoading: false,
        searchCache: {}
      });
      return dbSettings;
    } catch (e) {
      console.error("Data load failed", e);
      set({ isLoading: false });
    }
  },

  addNote: async (note) => {
    await db.notes.add(note);
    set(state => ({ 
      notes: [note, ...state.notes],
      searchCache: {} // Invalidate cache on change
    }));
  },

  updateNote: async (id, updates) => {
    const note = get().notes.find(n => n.id === id);
    if (!note) return;
    
    // Якщо оновлюємо лише статус синхронізації, не позначаємо як dirty і не збільшуємо версію
    const isSyncUpdate = Object.keys(updates).every(k => ['syncStatus', 'lastSyncedAt', 'isDirty', 'isEncrypted'].includes(k));
    
    const updated = { 
        ...note, 
        ...updates, 
        updatedAt: isSyncUpdate ? note.updatedAt : Date.now(), 
        version: isSyncUpdate ? note.version : (note.version || 1) + 1,
        isDirty: isSyncUpdate ? (updates.isDirty ?? note.isDirty) : true 
    };
    
    await db.notes.put(updated);
    set(state => ({ 
      notes: state.notes.map(n => n.id === id ? updated : n),
      searchCache: {} 
    }));
    return updated;
  },

  deleteNote: async (id) => {
    await db.notes.delete(id);
    set(state => ({ 
      notes: state.notes.filter(n => n.id !== id),
      searchCache: {}
    }));
  },

  toggleNoteCompleted: async (id) => {
    const note = get().notes.find(n => n.id === id);
    if (!note) return;
    const updated = { 
        ...note, 
        completed: !note.completed, 
        updatedAt: Date.now(), 
        version: (note.version || 1) + 1,
        isDirty: true
    };
    await db.notes.put(updated);
    set(state => ({
        notes: state.notes.map(n => n.id === id ? updated : n),
        searchCache: {}
    }));
  },

  updateProject: async (id, updates) => {
    const project = get().projects.find(p => p.id === id);
    if (!project) return;
    const updated = { ...project, ...updates, updatedAt: Date.now() };
    await db.projects.put(updated);
    set(state => ({
        projects: state.projects.map(p => p.id === id ? updated : p)
    }));
  },

  deleteProject: async (id) => {
    const project = get().projects.find(p => p.id === id);
    if (!project) return;

    // 1. Unified Sync (Cloud + FileSystem)
    try {
        const { unifiedSyncService } = await import('../../services/unifiedSyncService');
        await unifiedSyncService.deleteProject(id, project.name);
    } catch (e) {
        console.error("[DataSlice] Unified delete failed:", e);
    }

    // 2. Local DB
    await db.projects.delete(id);
    await db.notes.where('projectId').equals(id).delete();
    
    // 3. Store State
    set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        notes: state.notes.filter(n => n.projectId !== id),
        activeProjectId: state.activeProjectId === id ? '1' : state.activeProjectId,
        searchCache: {}
    }));
  }
});
