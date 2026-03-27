import type { Note } from '../types/entities';
import db from '../services/db';

/**
 * Find notes that share tags with the given note
 */
export const findRelatedNotes = async (note: Note, limit: number = 5): Promise<Note[]> => {
  if (!note.tags || note.tags.length === 0) {
    return [];
  }

  // Get all notes from the database
  const allNotes = await db.notes.toArray();
  
  // Calculate similarity score for each note based on shared tags
  const relatedNotesWithScores = allNotes
    .filter(n => n.id !== note.id) // Exclude the current note
    .map(n => {
      const sharedTags = note.tags.filter(tag => n.tags.includes(tag));
      const score = sharedTags.length;
      
      return {
        note: n,
        score,
        sharedTags
      };
    })
    .filter(item => item.score > 0) // Only notes with at least one shared tag
    .sort((a, b) => b.score - a.score); // Sort by highest score first

  // Return the top related notes
  return relatedNotesWithScores.slice(0, limit).map(item => ({
    ...item.note,
    relatedInfo: {
      sharedTags: item.sharedTags,
      score: item.score
    }
  }));
};

/**
 * Find notes that share tags with the given note (synchronous version for client-side filtering)
 */
export const findRelatedNotesSync = (note: Note, allNotes: Note[], limit: number = 5): Note[] => {
  if (!note.tags || note.tags.length === 0) {
    return [];
  }

  // Calculate similarity score for each note based on shared tags
  const relatedNotesWithScores = allNotes
    .filter(n => n.id !== note.id) // Exclude the current note
    .map(n => {
      const sharedTags = note.tags.filter(tag => n.tags && n.tags.includes(tag));
      const score = sharedTags.length;
      
      return {
        note: n,
        score,
        sharedTags
      };
    })
    .filter(item => item.score > 0) // Only notes with at least one shared tag
    .sort((a, b) => b.score - a.score); // Sort by highest score first

  // Return the top related notes
  return relatedNotesWithScores.slice(0, limit).map(item => ({
    ...item.note,
    relatedInfo: {
      sharedTags: item.sharedTags,
      score: item.score
    }
  }));
};