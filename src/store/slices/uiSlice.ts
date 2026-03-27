import type { StateCreator } from 'zustand';

export type MobileTab = 'workspace' | 'projects' | 'ai' | 'profile';

export interface UiSlice {
  isZenMode: boolean;
  isSidebarVisible: boolean;
  isRightPanelVisible: boolean;
  isSettingsOpen: boolean;
  isUserCabinetOpen: boolean;
  isProjectDigestOpen: boolean;
  isInsightModalOpen: boolean;
  isReadmeOpen: boolean;
  isAuthOpen: boolean;
  isCreatingProject: boolean;
  isRenamingProject: boolean;
  isDeletingProject: string | null;
  isDeletingNote: any | null;
  currentMobileTab: string;
  sidebarWidth: number;
  rightPanelWidth: number;
  sidebarSections: { id: string; label: string; visible: boolean }[];
  
  setZenMode: (enabled: boolean) => void;
  setSidebarVisible: (visible: boolean) => void;
  setRightPanelVisible: (visible: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setUserCabinetOpen: (open: boolean) => void;
  setProjectDigestOpen: (open: boolean) => void;
  setInsightModalOpen: (open: boolean) => void;
  setReadmeOpen: (open: boolean) => void;
  setAuthOpen: (open: boolean) => void;
  setCreatingProject: (creating: boolean) => void;
  setRenamingProject: (renaming: boolean) => void;
  setDeletingProject: (id: string | null) => void;
  setDeletingNote: (note: any | null) => void;
  setMobileTab: (tab: string) => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleSidebarSection: (sectionId: string) => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  isZenMode: false,
  isSidebarVisible: true,
  isRightPanelVisible: false,
  isSettingsOpen: false,
  isUserCabinetOpen: false,
  isProjectDigestOpen: false,
  isInsightModalOpen: false,
  isReadmeOpen: false,
  isAuthOpen: false,
  isCreatingProject: false,
  isRenamingProject: false,
  isDeletingProject: null,
  isDeletingNote: null,
  currentMobileTab: 'notes',
  sidebarWidth: typeof window !== 'undefined' ? Number(localStorage.getItem('sidebarWidth') || '280') : 280,
  rightPanelWidth: typeof window !== 'undefined' ? Number(localStorage.getItem('rightPanelWidth') || '400') : 400,
  sidebarSections: [
    { id: 'workspace', label: 'Workspace', visible: true },
    { id: 'smartViews', label: 'Smart Views', visible: true },
    { id: 'projects', label: 'Projects', visible: true },
  ],

  setZenMode: (enabled) => set({ isZenMode: enabled }),
  setSidebarVisible: (visible) => set({ isSidebarVisible: visible }),
  setRightPanelVisible: (visible) => set({ isRightPanelVisible: visible }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setUserCabinetOpen: (open) => set({ isUserCabinetOpen: open }),
  setProjectDigestOpen: (open) => set({ isProjectDigestOpen: open }),
  setInsightModalOpen: (open) => set({ isInsightModalOpen: open }),
  setReadmeOpen: (open) => set({ isReadmeOpen: open }),
  setAuthOpen: (open) => set({ isAuthOpen: open }),
  setCreatingProject: (creating) => set({ isCreatingProject: creating }),
  setRenamingProject: (renaming) => set({ isRenamingProject: renaming }),
  setDeletingProject: (id) => set({ isDeletingProject: id }),
  setDeletingNote: (note) => set({ isDeletingNote: note }),
  setMobileTab: (tab) => set({ currentMobileTab: tab }),
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
  toggleSidebarSection: (sectionId) => set((state) => ({
    sidebarSections: state.sidebarSections.map(s => 
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    )
  })),
});
