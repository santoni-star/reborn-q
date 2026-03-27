export interface Note {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: 'idea' | 'bug' | 'architecture' | 'todo' | 'generic';
  color?: string;
  tags: string[];
  createdAt: number;
  updatedAt?: number;
  completed?: boolean;
  syncStatus: 'pending' | 'synced' | 'error';
  version?: number;
  isDirty?: boolean;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  knowledge?: string;
  color?: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AppState {
  notes: Note[];
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  settings: any;
}
