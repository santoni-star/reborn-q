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
  isDeletingProject: string | null;
  currentMobileTab: MobileTab;
  sidebarWidth: number;
  rightPanelWidth: number;
  sidebarSections: {
    workspace: boolean;
    smartViews: boolean;
    projects: boolean;
  };
  
  setZenMode: (enabled: boolean) => void;
  setSidebarVisible: (visible: boolean) => void;
  setRightPanelVisible: (visible: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setUserCabinetOpen: (open: boolean) => void;
  setProjectDigestOpen: (open: boolean) => void;
  setInsightModalOpen: (open: boolean) => void;
  setReadmeOpen: (open: boolean) => void;
  setAuthOpen: (open: boolean) => void;
  setDeletingProject: (id: string | null) => void;
  setMobileTab: (tab: MobileTab) => void;
  setSidebarWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  toggleSidebarSection: (section: 'workspace' | 'smartViews' | 'projects') => void;
}

export const createUiSlice: StateCreator<UiSlice> = (set) => ({
  isZenMode: false,
  isSidebarVisible: true,
  isRightPanelVisible: true,
  isSettingsOpen: false,
  isUserCabinetOpen: false,
  isProjectDigestOpen: false,
  isInsightModalOpen: false,
  isReadmeOpen: false,
  isAuthOpen: false,
  isDeletingProject: null,
  currentMobileTab: 'workspace',
  sidebarWidth: 260,
  rightPanelWidth: 320,
  sidebarSections: {
    workspace: true,
    smartViews: true,
    projects: true,
  },

  setZenMode: (enabled) => set({ isZenMode: enabled }),
  setSidebarVisible: (visible) => set({ isSidebarVisible: visible }),
  setRightPanelVisible: (visible) => set({ isRightPanelVisible: visible }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setUserCabinetOpen: (open) => set({ isUserCabinetOpen: open }),
  setProjectDigestOpen: (open) => set({ isProjectDigestOpen: open }),
  setInsightModalOpen: (open) => set({ isInsightModalOpen: open }),
  setReadmeOpen: (open) => set({ isReadmeOpen: open }),
  setAuthOpen: (open) => set({ isAuthOpen: open }),
  setDeletingProject: (id) => set({ isDeletingProject: id }),
  setMobileTab: (tab) => set({ currentMobileTab: tab }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
  toggleSidebarSection: (section) => set((state) => ({
    sidebarSections: { ...state.sidebarSections, [section]: !state.sidebarSections[section] }
  })),
});
