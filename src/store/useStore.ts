import { create } from 'zustand';
import { createNotesSlice, NotesSlice } from './slices/notesSlice';

export type { MobileTab } from './slices/notesSlice';

export const useStore = create<NotesSlice>()((...a) => ({
  ...createNotesSlice(...a),
}));
