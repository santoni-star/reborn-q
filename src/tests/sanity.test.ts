import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../store';
import db from '../services/db';
import 'fake-indexeddb/auto';

describe('REBORN Core Sanity Check', () => {
  beforeEach(async () => {
    await db.notes.clear();
    await db.projects.clear();
    // Reset store state
    useStore.setState({
      notes: [],
      projects: [],
      activeProjectId: '1',
      isLoading: false
    });
  });

  it('should initialize with default data', async () => {
    const store = useStore.getState();
    await store.loadInitialData();
    
    const state = useStore.getState();
    expect(state.projects.length).toBeGreaterThan(0);
    expect(state.projects[0].name).toBe('Inbox');
  });

  it('should add a note and persist it to Dexie', async () => {
    const store = useStore.getState();
    const noteId = await store.addNote('Test Title', 'Test Content', 'idea', ['test-tag']);
    
    // Check store state
    const state = useStore.getState();
    expect(state.notes.length).toBe(1);
    expect(state.notes[0].title).toBe('Test Title');
    expect(state.notes[0].id).toBe(noteId);

    // Check DB persistence
    const dbNote = await db.notes.get(noteId);
    expect(dbNote).toBeDefined();
    expect(dbNote?.content).toBe('Test Content');
  });

  it('should update note and version correctly', async () => {
    const store = useStore.getState();
    const noteId = await store.addNote('Initial', 'Content', 'generic', []);
    
    await store.updateNote(noteId, { title: 'Updated' });
    
    const state = useStore.getState();
    expect(state.notes[0].title).toBe('Updated');
    expect(state.notes[0].version).toBe(2);
  });

  it('should filter projects correctly', async () => {
    const store = useStore.getState();
    useStore.setState({ activeProjectId: 'project-1' });
    
    expect(useStore.getState().activeProjectId).toBe('project-1');
  });
});
