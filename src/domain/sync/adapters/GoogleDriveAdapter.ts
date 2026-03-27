import { ISyncProvider } from '../ISyncProvider';

export class GoogleDriveAdapter implements ISyncProvider {
  async uploadNote(noteId: string, content: string): Promise<void> {
    console.log('[GoogleDriveAdapter] Uploading via GDrive API...');
    // Тут буде логіка з googleDriveSyncService.ts
  }
  async downloadNote(noteId: string): Promise<string> { return ''; }
  async deleteNote(noteId: string): Promise<void> { }
}
