export interface ISyncProvider {
  uploadNote(noteId: string, content: string): Promise<void>;
  downloadNote(noteId: string): Promise<string>;
  deleteNote(noteId: string): Promise<void>;
}
