import { ISyncProvider } from './ISyncProvider';
import { FirebaseAdapter } from './adapters/FirebaseAdapter';
import { GoogleDriveAdapter } from './adapters/GoogleDriveAdapter';

export class SyncOrchestrator {
  private providers: ISyncProvider[] = [];

  constructor() {
    this.providers.push(new FirebaseAdapter());
    this.providers.push(new GoogleDriveAdapter());
  }

  async syncNote(noteId: string, content: string): Promise<void> {
    // Централізована черга запитів буде тут
    await Promise.all(this.providers.map(p => p.uploadNote(noteId, content)));
  }
}
