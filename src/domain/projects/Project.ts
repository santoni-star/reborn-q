export interface Project {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export const createProject = (name: string): Project => ({
  id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
  name,
  createdAt: Date.now(),
  updatedAt: Date.now()
});
