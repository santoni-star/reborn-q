import { describe, it, expect } from 'vitest';
import { getMostRecentNote } from '../services/unifiedSyncService';
import type { Note } from '../types/entities';

describe('UnifiedSyncService: Conflict Resolution', () => {
  const baseNote: Note = {
    id: '1',
    projectId: '1',
    title: 'Base',
    content: 'Content',
    type: 'generic',
    tags: [],
    createdAt: 1000,
    updatedAt: 1000,
    version: 1
  };

  it('should prefer note with higher microsecond timestamp', () => {
    const note1 = { ...baseNote, timestampMicroseconds: 2000000 };
    const note2 = { ...baseNote, timestampMicroseconds: 1000000 };
    
    expect(getMostRecentNote(note1, note2)).toBe(note1);
    expect(getMostRecentNote(note2, note1)).toBe(note1);
  });

  it('should prefer note with higher updatedAt if microseconds are missing', () => {
    const note1 = { ...baseNote, updatedAt: 2000 };
    const note2 = { ...baseNote, updatedAt: 1000 };
    
    expect(getMostRecentNote(note1, note2)).toBe(note1);
  });

  it('should prefer note with higher version if timestamps are equal', () => {
    const note1 = { ...baseNote, updatedAt: 1000, version: 5 };
    const note2 = { ...baseNote, updatedAt: 1000, version: 2 };
    
    expect(getMostRecentNote(note1, note2)).toBe(note1);
  });

  it('should return note1 if both are identical', () => {
    const note1 = { ...baseNote };
    const note2 = { ...baseNote };
    
    expect(getMostRecentNote(note1, note2)).toBe(note1);
  });
});
