import type { StateCreator } from 'zustand';
import type { Note, Project } from '../../types/entities';
import db from '../../services/db';

export interface DataSlice {
  notes: Note[];
  projects: Project[];
  activeProjectId: string | null;
  editingProjectId: string | null;
  searchQuery: string;
  searchCache: Record<string, Note[]>;
  isLoading: boolean;
  isProcessing: boolean;

  setNotes: (notes: Note[]) => void;
  setProjects: (projects: Project[]) => void;
  setActiveProject: (id: string | null) => void;
  setEditingProject: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  loadInitialData: () => Promise<void>;
  addNote: (noteOrTitle: any, content?: string, type?: any, tags?: string[]) => Promise<string>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<Note | undefined>;
  deleteNote: (id: string | Note) => Promise<void>;
  toggleNoteCompleted: (id: string) => Promise<void>;
  addProject: (project: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const createDataSlice: StateCreator<DataSlice> = (set, get) => ({
  notes: [],
  projects: [],
  activeProjectId: '1',
  editingProjectId: null,
  searchQuery: '',
  searchCache: {},
  isLoading: true,
  isProcessing: false,

  setNotes: (notes) => set({ notes, searchCache: {} }),
  setProjects: (projects) => set({ projects }),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setEditingProject: (id) => set({ editingProjectId: id }),

  setSearchQuery: (searchQuery) => {
    // ... (rest of search logic same as before)
    const query = searchQuery.toLowerCase().trim();
    
    if (query === '') {
      set({ searchQuery: '', searchCache: {} });
      return;
    }

    const cachedResults = get().searchCache[query];
    if (cachedResults) {
      set({ searchQuery });
      return;
    }

    const allNotes = get().notes;
    const filteredNotes = allNotes.filter(note => {
      const lowerTitle = (note.title || '').toLowerCase();
      const lowerContent = (note.content || '').toLowerCase();
      const hasMatchingTag = note.tags && note.tags.some(tag =>
        (tag || '').toLowerCase().includes(query)
      );

      return lowerTitle.includes(query) || lowerContent.includes(query) || hasMatchingTag;
    });

    const newCache = { ...get().searchCache };
    newCache[query] = filteredNotes;
    if (Object.keys(newCache).length > 50) {
      const keys = Object.keys(newCache);
      for (let i = 0; i < 10; i++) delete newCache[keys[i]];
    }

    set({ searchQuery, searchCache: newCache });
  },

  loadInitialData: async () => {
    set({ isLoading: true });
    try {
      // 1. Load from Local IndexedDB
      const [notes, projects] = await Promise.all([
        db.notes.toArray(),
        db.projects.toArray()
      ]);

      set({
        notes: notes.sort((a, b) => b.createdAt - a.createdAt),
        projects: projects.length > 0 ? projects : [{ id: '1', name: 'Inbox', createdAt: Date.now(), updatedAt: Date.now() }],
        isLoading: false,
        searchCache: {}
      });

      // 2. Load from Firebase if authenticated
      const { firebaseService } = await import('../../services/firebaseService');
      if (firebaseService.isAuthenticated()) {
        console.log('[DataSlice] Loading initial data from Firebase...');
        const [remoteNotes, remoteProjects] = await Promise.all([
          firebaseService.getNotes(),
          firebaseService.getProjects()
        ]);

        if (remoteNotes.length > 0 || remoteProjects.length > 0) {
            set({ 
              notes: (remoteNotes as Note[]).sort((a, b) => b.createdAt - a.createdAt), 
              projects: remoteProjects as Project[] 
            });
            
            // Optionally sync remote to local if local is empty? 
            // For now just update state, sync will handle the rest.
        }
      }
    } catch (e) {
      console.error("Data load failed", e);
      set({ isLoading: false });
    }
  },

  addNote: async (noteOrTitle, content, type, tags) => {
    let note: Note;
    if (typeof noteOrTitle === 'object' && noteOrTitle.id) {
        note = noteOrTitle as Note;
    } else {
        note = {
            id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            projectId: get().activeProjectId || '1',
            title: noteOrTitle as string,
            content: content || '',
            type: type || 'generic',
            tags: tags || [],
            createdAt: Date.now(),
            syncStatus: 'pending'
        };
    }

    await db.notes.add(note);
    set(state => ({ 
      notes: [note, ...state.notes],
      searchCache: {}
    }));
    
    const { unifiedSyncService } = await import('../../services/unifiedSyncService');
    const project = get().projects.find(p => p.id === note.projectId);
    await unifiedSyncService.syncNote(note, project?.name);
    return note.id;
  },

  updateNote: async (id, updates) => {
    const note = get().notes.find(n => n.id === id);
    if (!note) return;
    
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

    if (!isSyncUpdate) {
        const { unifiedSyncService } = await import('../../services/unifiedSyncService');
        const project = get().projects.find(p => p.id === updated.projectId);
        await unifiedSyncService.syncNote(updated, project?.name);
    }

    return updated;
  },

  deleteNote: async (note) => {
    const id = typeof note === 'string' ? note : note.id;
    await db.notes.delete(id);
    set(state => ({ 
      notes: state.notes.filter(n => n.id !== id),
      searchCache: {}
    }));

    const { firebaseService } = await import('../../services/firebaseService');
    await firebaseService.deleteNote(id);
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
    
    const { unifiedSyncService } = await import('../../services/unifiedSyncService');
    const project = get().projects.find(p => p.id === updated.projectId);
    await unifiedSyncService.syncNote(updated, project?.name);
  },

  addProject: async (project) => {
    const existing = get().projects.find(p => p.name.toLowerCase() === project.name.toLowerCase());
    if (existing) {
        const msg = `Project with name "${project.name}" already exists.`;
        const { toast } = await import('../../utils/toast');
        toast.error(msg);
        throw new Error('Duplicate project name');
    }

    await db.projects.add(project);
    set(state => ({
        projects: [...state.projects, project]
    }));
    
    const { unifiedSyncService } = await import('../../services/unifiedSyncService');
    await unifiedSyncService.syncProject(project);
  },

  updateProject: async (id, updates) => {
    const project = get().projects.find(p => p.id === id);
    if (!project) return;
    const updated = { ...project, ...updates, updatedAt: Date.now() };
    await db.projects.put(updated);
    set(state => ({
        projects: state.projects.map(p => p.id === id ? updated : p)
    }));
    
    const { unifiedSyncService } = await import('../../services/unifiedSyncService');
    await unifiedSyncService.syncProject(updated);
  },

  deleteProject: async (id) => {
    const project = get().projects.find(p => p.id === id);
    if (!project) return;

    try {
        const { unifiedSyncService } = await import('../../services/unifiedSyncService');
        await unifiedSyncService.deleteProject(id, project.name);
    } catch (e) {
        console.error("[DataSlice] Unified delete failed:", e);
    }

    await db.projects.delete(id);
    await db.notes.where('projectId').equals(id).delete();
    
    set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        notes: state.notes.filter(n => n.projectId !== id),
        activeProjectId: state.activeProjectId === id ? '1' : state.activeProjectId,
        searchCache: {}
    }));
  }
});
