import { describe, it, expect } from 'vitest';
import { Note } from '../types/entities';
import { getMostRecentNote, isNoteDirtyOrPending } from '../services/unifiedSyncService';

describe('Conflict Resolution Logic', () => {
  it('should prefer note with later microsecond timestamp', () => {
    const note1: Note = {
      id: '1',
      projectId: 'project1',
      title: 'Test Note 1',
      content: 'Content 1',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      timestampMicroseconds: 1678886400000000,
      version: 1
    };

    const note2: Note = {
      id: '2',
      projectId: 'project1',
      title: 'Test Note 2',
      content: 'Content 2',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      timestampMicroseconds: 1678886500000000,
      version: 1
    };

    const mostRecent = getMostRecentNote(note1, note2);
    expect(mostRecent.id).toBe(note2.id);
  });

  it('should use version number as tiebreaker for equal timestamps', () => {
    const note3: Note = {
      id: '3',
      projectId: 'project1',
      title: 'Test Note 3',
      content: 'Content 3',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      timestampMicroseconds: 1678886400000000,
      version: 1
    };

    const note4: Note = {
      id: '4',
      projectId: 'project1',
      title: 'Test Note 4',
      content: 'Content 4',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      timestampMicroseconds: 1678886400000000,
      version: 2
    };

    const mostRecent = getMostRecentNote(note3, note4);
    expect(mostRecent.id).toBe(note4.id);
  });

  it('should fallback to updatedAt if microseconds are missing', () => {
    const note5: Note = {
      id: '5',
      projectId: 'project1',
      title: 'Test Note 5',
      content: 'Content 5',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      updatedAt: 1678886400000,
      version: 1
    };

    const note6: Note = {
      id: '6',
      projectId: 'project1',
      title: 'Test Note 6',
      content: 'Content 6',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      updatedAt: 1678886500000,
      version: 1
    };

    const mostRecent = getMostRecentNote(note5, note6);
    expect(mostRecent.id).toBe(note6.id);
  });

  it('should correctly detect dirty or pending notes', () => {
    const cleanNote: Note = {
      id: '7',
      projectId: 'project1',
      title: 'Clean Note',
      content: 'Content 7',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      syncStatus: 'synced'
    };

    const dirtyNote: Note = {
      id: '8',
      projectId: 'project1',
      title: 'Dirty Note',
      content: 'Content 8',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      isDirty: true
    };

    const pendingNote: Note = {
      id: '9',
      projectId: 'project1',
      title: 'Pending Note',
      content: 'Content 9',
      type: 'generic',
      tags: [],
      createdAt: Date.now(),
      syncStatus: 'pending'
    };

    expect(isNoteDirtyOrPending(cleanNote)).toBe(false);
    expect(isNoteDirtyOrPending(dirtyNote)).toBe(true);
    expect(isNoteDirtyOrPending(pendingNote)).toBe(true);
  });
});