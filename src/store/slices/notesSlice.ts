import { StateCreator } from 'zustand';
import type { Note, Project, AppSettings } from '../types/entities';

export type MobileTab = 'workspace' | 'projects' | 'ai' | 'profile';

export interface NotesSlice {
  // Data
  notes: Note[];
  projects: Project[];

  // Settings
  settings: AppSettings;
  
  // User
  currentUser: { uid: string; email: string | null; displayName?: string | null; photoURL?: string | null } | null;
  setCurrentUser: (user: { uid: string; email: string | null; displayName?: string | null; photoURL?: string | null } | null) => void;

  // UI State
  activeProjectId: string | null;
  isZenMode: boolean;
  isSidebarVisible: boolean;
  isRightPanelVisible: boolean;
  isReadmeOpen: boolean;
  isSettingsOpen: boolean;
  isAuthOpen: boolean;
  isUserCabinetOpen: boolean;
  editingProjectId: string | null;
  isCreatingProject: boolean;
  isRenamingProject: boolean;
  isDeletingProject: string | null;
  isDeletingNote: Note | null;
  isInsightModalOpen: boolean;
  isProjectDigestOpen: boolean;
  
  // Mobile
  currentMobileTab: string;
  
  // Search
  searchQuery: string;
  searchCache: Record<string, { id: string; title: string; content: string; tags: string[] }[]>;
  
  // Layout
  sidebarWidth: number;
  rightPanelWidth: number;
  
  // Connection
  isFolderConnected: boolean;
  
  // AI Status
  aiStatus: 'idle' | 'loading' | 'success' | 'error' | 'connected' | 'disconnected' | 'connecting';
  aiStatusMsg: string;

  // Actions
  setNotes: (notes: Note[]) => void;
  setProjects: (projects: Project[]) => void;
  setSettings: (settings: Partial<AppSettings>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  setActiveProjectId: (id: string | null) => void;
  setActiveProject: (id: string) => void;
  setZenMode: (enabled: boolean) => void;
  setSidebarVisible: (visible: boolean) => void;
  setRightPanelVisible: (visible: boolean) => void;
  setReadmeOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setAuthOpen: (open: boolean) => void;
  setUserCabinetOpen: (open: boolean) => void;
  setEditingProjectId: (id: string | null) => void;
  setEditingProject: (id: string | null) => void;
  setCreatingProject: (creating: boolean) => void;
  setRenamingProject: (renaming: boolean) => void;
  setDeletingProject: (id: string | null) => void;
  setDeletingNote: (note: Note | null) => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setInsightModalOpen: (open: boolean) => void;
  setProjectDigestOpen: (open: boolean) => void;
  setMobileTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  setFolderConnected: (connected: boolean) => void;
  setAiStatus: (status: 'idle' | 'loading' | 'success' | 'error', msg?: string) => void;
  
  // Sidebar sections
  sidebarSections: { id: string; label: string; visible: boolean }[];
  toggleSidebarSection: (sectionId: string) => void;
  
  // Data actions
  addNote: (note: Note) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (note: Note | string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  toggleNoteCompleted: (id: string) => void;
  loadInitialData: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  aiProvider: 'browser',
  transcriptionProvider: 'browser',
  language: 'en',
  fontSize: 'base',
  openaiKey: '',
  geminiKey: '',
  groqKey: '',
  googleAccessToken: '',
  autoSync: false,
  autoSyncAuth: false,
  disableExpansion: false,
  cloudSyncEnabled: false,
  localSyncEnabled: false,
  showDevInsight: true,
};

export const createNotesSlice: StateCreator<NotesSlice> = (set, get) => ({
  // Initial state - load from localStorage if available
  notes: typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('notes') || '[]') 
    : [],
  projects: typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('projects') || '[]') 
    : [],
  settings: typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('settings') || JSON.stringify(defaultSettings)) 
    : defaultSettings,
  currentUser: null,
  activeProjectId: '1',
  isZenMode: false,
  isSidebarVisible: true,
  isRightPanelVisible: false,
  isReadmeOpen: false,
  isSettingsOpen: false,
  isAuthOpen: false,
  isUserCabinetOpen: false,
  editingProjectId: null,
  isCreatingProject: false,
  isRenamingProject: false,
  isDeletingProject: null,
  isDeletingNote: null,
  isInsightModalOpen: false,
  isProjectDigestOpen: false,
  currentMobileTab: 'notes',
  searchQuery: '',
  searchCache: {},
  sidebarWidth: typeof window !== 'undefined' ? Number(localStorage.getItem('sidebarWidth') || '280') : 280,
  rightPanelWidth: typeof window !== 'undefined' ? Number(localStorage.getItem('rightPanelWidth') || '400') : 400,
  isFolderConnected: typeof window !== 'undefined' ? localStorage.getItem('isFolderConnected') === 'true' : false,
  aiStatus: 'idle',
  aiStatusMsg: '',
  sidebarSections: [
    { id: 'workspace', label: 'Workspace', visible: true },
    { id: 'smartViews', label: 'Smart Views', visible: true },
    { id: 'projects', label: 'Projects', visible: true },
  ],
  toggleSidebarSection: (sectionId) => set((state) => ({
    sidebarSections: state.sidebarSections.map(s => 
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    )
  })),

  // Setters
  setNotes: (notes) => {
    set({ notes });
    if (typeof window !== 'undefined') {
      localStorage.setItem('notes', JSON.stringify(notes));
    }
  },
  setProjects: (projects) => {
    set({ projects });
    if (typeof window !== 'undefined') {
      localStorage.setItem('projects', JSON.stringify(projects));
    }
  },
  setSettings: (newSettings) => set((state) => {
    const updated = { ...state.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings', JSON.stringify(updated));
    }
    return { settings: updated };
  }),
  updateSettings: (newSettings) => set((state) => {
    const updated = { ...state.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      localStorage.setItem('settings', JSON.stringify(updated));
    }
    return { settings: updated };
  }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setActiveProject: (id) => set({ activeProjectId: id }),
  setZenMode: (enabled) => set({ isZenMode: enabled }),
  setSidebarVisible: (visible) => set({ isSidebarVisible: visible }),
  setRightPanelVisible: (visible) => set({ isRightPanelVisible: visible }),
  setReadmeOpen: (open) => set({ isReadmeOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setAuthOpen: (open) => set({ isAuthOpen: open }),
  setUserCabinetOpen: (open) => set({ isUserCabinetOpen: open }),
  setEditingProjectId: (id) => set({ editingProjectId: id }),
  setEditingProject: (id) => set({ editingProjectId: id }),
  setCreatingProject: (creating) => set({ isCreatingProject: creating }),
  setRenamingProject: (renaming) => set({ isRenamingProject: renaming }),
  setDeletingProject: (id) => set({ isDeletingProject: id }),
  setDeletingNote: (note) => set({ isDeletingNote: note }),
  setSidebarWidth: (width) => {
    set({ sidebarWidth: width });
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarWidth', String(width));
    }
  },
  setRightPanelWidth: (width) => {
    set({ rightPanelWidth: width });
    if (typeof window !== 'undefined') {
      localStorage.setItem('rightPanelWidth', String(width));
    }
  },
  setInsightModalOpen: (open) => set({ isInsightModalOpen: open }),
  setProjectDigestOpen: (open) => set({ isProjectDigestOpen: open }),
  setMobileTab: (tab) => set({ currentMobileTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFolderConnected: (connected) => {
    set({ isFolderConnected: connected });
    if (typeof window !== 'undefined') {
      localStorage.setItem('isFolderConnected', String(connected));
    }
  },
  setAiStatus: (status, msg = '') => set({ aiStatus: status, aiStatusMsg: msg }),
  setCurrentUser: (user) => set({ currentUser: user }),

  // Data actions - stub implementations with localStorage persistence
  addNote: async (note) => {
    set((state) => {
      const newNotes = [...state.notes, note];
      if (typeof window !== 'undefined') {
        localStorage.setItem('notes', JSON.stringify(newNotes));
      }
      return { notes: newNotes };
    });
  },
  updateNote: async (id, updates) => {
    set((state) => {
      const newNotes = state.notes.map(n => n.id === id ? { ...n, ...updates } : n);
      if (typeof window !== 'undefined') {
        localStorage.setItem('notes', JSON.stringify(newNotes));
      }
      return { notes: newNotes };
    });
  },
  deleteNote: async (note) => {
    const noteId = typeof note === 'string' ? note : note.id;
    set((state) => {
      const newNotes = state.notes.filter(n => n.id !== noteId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('notes', JSON.stringify(newNotes));
      }
      return { notes: newNotes };
    });
  },
  deleteProject: async (id) => {
    set((state) => {
      const newProjects = state.projects.filter(p => p.id !== id);
      const newNotes = state.notes.filter(n => n.projectId !== id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('projects', JSON.stringify(newProjects));
        localStorage.setItem('notes', JSON.stringify(newNotes));
      }
      return { projects: newProjects, notes: newNotes };
    });
  },
  addProject: (project) => {
    set((state) => {
      const newProjects = [...state.projects, project];
      if (typeof window !== 'undefined') {
        localStorage.setItem('projects', JSON.stringify(newProjects));
      }
      return { projects: newProjects };
    });
  },
  updateProject: (id, updates) => {
    set((state) => {
      const newProjects = state.projects.map(p => p.id === id ? { ...p, ...updates } : p);
      if (typeof window !== 'undefined') {
        localStorage.setItem('projects', JSON.stringify(newProjects));
      }
      return { projects: newProjects };
    });
  },
  toggleNoteCompleted: (id) => {
    set((state) => {
      const newNotes = state.notes.map(n => n.id === id ? { ...n, completed: !n.completed } : n);
      if (typeof window !== 'undefined') {
        localStorage.setItem('notes', JSON.stringify(newNotes));
      }
      return { notes: newNotes };
    });
  },
  loadInitialData: async () => {
    // Stub - will be implemented properly
    console.log('[Store] Initial data loaded');
  },
});
