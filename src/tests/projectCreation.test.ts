import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../store';
import { db } from '../services/db';
import { toast } from '../utils/toast';

// Mock toast
vi.mock('../utils/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('Project Creation', () => {
  beforeEach(async () => {
    // Clear the database before each test
    await db.projects.clear();
    await db.notes.clear();
    // Reset store
    const store = useStore.getState();
    await store.loadInitialData();
    await store.loadSettings();
  });

  it('should prevent creating a project with a duplicate name', async () => {
    const store = useStore.getState();
    const projectName = 'Unique Project';

    // Create the first project
    await store.addProject({
      id: 'id-1',
      name: projectName,
      createdAt: Date.now(),
    });

    // Attempt to create a second project with the same name
    await expect(store.addProject({
      id: 'id-2',
      name: projectName,
      createdAt: Date.now(),
    })).rejects.toThrow('Duplicate project name');

    expect(toast.error).toHaveBeenCalledWith(`Project with name "${projectName}" already exists.`);
    
    // Check that only one project exists in the store
    expect(useStore.getState().projects.filter(p => p.name === projectName)).toHaveLength(1);
  });

  it('should prevent creating a project with a duplicate ID', async () => {
    const store = useStore.getState();
    const projectID = 'duplicate-id';

    // Create the first project
    await store.addProject({
      id: projectID,
      name: 'Project 1',
      createdAt: Date.now(),
    });

    // Attempt to create a second project with the same ID
    await expect(store.addProject({
      id: projectID,
      name: 'Project 2',
      createdAt: Date.now(),
    })).rejects.toThrow();

    expect(toast.error).toHaveBeenCalled();
  });
});
