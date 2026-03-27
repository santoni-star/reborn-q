export type Note = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: 'idea' | 'bug' | 'architecture' | 'todo' | 'generic';
  tags: string[];
  color?: string;
  completed?: boolean;
  createdAt: number;
  updatedAt?: number;
  lastSyncedAt?: number;
  syncStatus?: 'synced' | 'pending' | 'error';
  contentHash?: string;
  isDirty?: boolean;
  version?: number;
  timestampMicroseconds?: number;
  isEncrypted?: boolean;
  relatedInfo?: {
    sharedTags: string[];
    score: number;
  };
}

export type ProjectRole = 'owner' | 'editor' | 'viewer';

export type ProjectMember = {
  uid: string;
  email?: string;
  role: ProjectRole;
  displayName?: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  knowledge?: string;
  color?: string;
  updatedAt?: number;
  createdAt?: number;
  userId?: string; // Owner UID
  members?: ProjectMember[];
  memberUids?: string[]; // For easy Firestore querying
}

export const createNote = (data: Partial<Note>): Note => ({
  id: data.id || crypto.randomUUID(),
  projectId: data.projectId || '1',
  title: data.title || '',
  content: data.content || '',
  type: data.type || 'generic',
  tags: data.tags || [],
  createdAt: data.createdAt || Date.now(),
  updatedAt: Date.now(),
  version: 1,
  isDirty: true
});

export const createProject = (name: string): Project => ({
  id: crypto.randomUUID(),
  name,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export type AiProvider = 'browser' | 'openai' | 'chatgpt-tab' | 'gemini-tab' | 'claude-tab' | 'grok-tab' | 'browser-native-extension' | 'free-ai' | 'gemini-api' | 'groq-api';
export type AppLanguage = 'en' | 'uk' | 'pl' | 'de' | 'auto';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';

export interface AppSettings {
  aiProvider: AiProvider;
  transcriptionProvider: 'browser' | 'groq';
  language: AppLanguage;
  fontSize: FontSize;
  openaiKey: string;
  geminiKey: string;
  groqKey: string;
  googleAccessToken: string;
  autoSync: boolean;
  autoSyncAuth: boolean;
  disableExpansion: boolean;
  cloudSyncEnabled: boolean;
  localSyncEnabled: boolean;
  showDevInsight: boolean;
  encryptionPassword?: string;
}
