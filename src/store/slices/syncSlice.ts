import type { StateCreator } from 'zustand';
import type { AppSettings } from '../../types/entities';
import db from '../../services/db';

export interface SyncSlice {
  settings: AppSettings;
  currentUser: any;
  aiStatus: 'disconnected' | 'connecting' | 'connected';
  aiStatusMsg: string;
  isFolderConnected: boolean;

  setCurrentUser: (user: any) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  setAiStatus: (status: 'disconnected' | 'connecting' | 'connected', msg?: string) => void;
  setFolderConnected: (connected: boolean) => void;
}

export const createSyncSlice: StateCreator<SyncSlice> = (set, get) => ({
  settings: {
    aiProvider: 'browser-native-extension',
    transcriptionProvider: 'browser',
    language: 'uk',
    fontSize: 'base',
    openaiKey: '',
    geminiKey: '',
    groqKey: '',
    googleAccessToken: '',
    autoSync: false,
    autoSyncAuth: true,
    disableExpansion: false,
    cloudSyncEnabled: false,
    localSyncEnabled: false,
    showDevInsight: false
  },
  currentUser: null,
  aiStatus: 'disconnected',
  aiStatusMsg: '',
  isFolderConnected: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setAiStatus: (status, msg) => set({ aiStatus: status, aiStatusMsg: msg || '' }),
  setFolderConnected: (connected) => set({ isFolderConnected: connected }),

  loadSettings: async () => {
    const dbSettings = await db.getSettings();
    if (dbSettings) {
      set({ settings: { ...get().settings, ...dbSettings } });
    }
  },

  updateSettings: async (newSettings) => {
    const updated = { ...get().settings, ...newSettings };
    set({ settings: updated });
    await db.updateSettings(updated);
  }
});
