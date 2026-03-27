// Unified Sync Service - об'єднує Firebase, Google Drive та локальну синхронізацію
import type { Note, Project } from '../types/entities';
import { firebaseService } from './firebaseService';
import { googleDriveSyncService } from './googleDriveSyncService';
import { syncService } from './syncService';
import { db } from './db';
import { useStore } from '../store/useStore';

export class UnifiedSyncService {
  private cloudSyncEnabled = false;
  private localSyncEnabled = false;
  private realtimeListeners: (() => void)[] = [];

  setCloudSyncEnabled(enabled: boolean) {
    this.cloudSyncEnabled = enabled;
  }

  setLocalSyncEnabled(enabled: boolean) {
    this.localSyncEnabled = enabled;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[UnifiedSync] Online! Flushing sync queue...');
        this.processQueue();
      });
    }
  }

  async processQueue() {
    if (!navigator.onLine || !firebaseService.isAuthenticated()) return;

    try {
      const pending = await db.pendingSync.orderBy('timestamp').toArray();
      if (pending.length === 0) return;

      console.log(`[UnifiedSync] Processing ${pending.length} pending changes...`);

      for (const item of pending) {
        try {
          if (item.entityType === 'note') {
            const note = await db.notes.get(item.entityId);
            if (note) {
              if (item.operation === 'delete') {
                await firebaseService.deleteNote(item.entityId);
              } else {
                await firebaseService.updateNote(item.entityId, note);
              }
            }
          } else if (item.entityType === 'project') {
            const project = await db.projects.get(item.entityId);
            if (project) {
              if (item.operation === 'delete') {
                await firebaseService.deleteProject(item.entityId);
              } else {
                await firebaseService.updateProject(item.entityId, project);
              }
            }
          }
          await db.pendingSync.delete(item.id!);
        } catch (e) {
          console.error(`[UnifiedSync] Failed to process queue item ${item.id}:`, e);
          // If it's a permanent error (like 404), we might want to skip it
        }
      }
    } catch (e) {
      console.error('[UnifiedSync] Queue processing error:', e);
    }
  }

  async syncNote(note: Note, projectName?: string): Promise<void> {
    const promises: Promise<void>[] = [];

    // Firebase sync
    if (this.cloudSyncEnabled && firebaseService.isAuthenticated()) {
      if (navigator.onLine) {
        promises.push(
          firebaseService.updateNote(note.id, { ...note }).catch(async (e) => {
            console.warn('[UnifiedSync] Firebase syncNote failed, adding to queue:', e);
            await db.pendingSync.add({
              entityType: 'note',
              entityId: note.id,
              operation: 'update',
              timestamp: Date.now()
            });
          })
        );
      } else {
        await db.pendingSync.add({
          entityType: 'note',
          entityId: note.id,
          operation: 'update',
          timestamp: Date.now()
        });
      }
    }

    // Google Drive sync
    if (this.cloudSyncEnabled && googleDriveSyncService.isAuthenticated() && projectName) {
      promises.push(
        (async () => {
          try {
            const rootId = await googleDriveSyncService.getOrCreateDevVoiceFolder();
            const projectId = await googleDriveSyncService.getOrCreateProjectFolder(rootId, projectName);
            await googleDriveSyncService.uploadNoteFile(projectId, note);
          } catch (e) {
            console.warn('[UnifiedSync] GDrive syncNote failed:', e);
          }
        })()
      );
    }

    // Local file system sync
    if (this.localSyncEnabled) {
      promises.push(
        syncService.syncNoteFile(note).catch(e => console.warn('[UnifiedSync] Local syncNote failed:', e))
      );
    }

    await Promise.all(promises);
  }

  async syncProject(project: Project): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.cloudSyncEnabled && firebaseService.isAuthenticated()) {
      if (navigator.onLine) {
        promises.push(
          firebaseService.updateProject(project.id, { ...project }).catch(async (e) => {
            console.warn('[UnifiedSync] Firebase syncProject failed, adding to queue:', e);
            await db.pendingSync.add({
              entityType: 'project',
              entityId: project.id,
              operation: 'update',
              timestamp: Date.now()
            });
          })
        );
      } else {
        await db.pendingSync.add({
          entityType: 'project',
          entityId: project.id,
          operation: 'update',
          timestamp: Date.now()
        });
      }
    }

    if (this.cloudSyncEnabled && googleDriveSyncService.isAuthenticated()) {
      promises.push(
        (async () => {
          try {
            const rootId = await googleDriveSyncService.getOrCreateDevVoiceFolder();
            const projectId = await googleDriveSyncService.getOrCreateProjectFolder(rootId, project.name);
            await googleDriveSyncService.uploadProjectMetadata(projectId, project);
          } catch (e) {
            console.warn('[UnifiedSync] GDrive syncProject failed:', e);
          }
        })()
      );
    }

    if (this.localSyncEnabled) {
      promises.push(
        syncService.syncProjectMetadata(project).catch(e => console.warn('[UnifiedSync] Local syncProject failed:', e))
      );
    }

    await Promise.all(promises);
  }

  async deleteNote(note: Note, projectName?: string): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.cloudSyncEnabled && firebaseService.isAuthenticated()) {
      promises.push(
        firebaseService.deleteNote(note.id).catch(e => console.warn('[UnifiedSync] Firebase deleteNote failed:', e))
      );
    }

    if (this.localSyncEnabled && projectName) {
      promises.push(
        syncService.deleteNoteFile(note).catch(e => console.warn('[UnifiedSync] Local deleteNote failed:', e))
      );
    }

    await Promise.all(promises);
  }

  async deleteProject(id: string, projectName: string): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.cloudSyncEnabled && firebaseService.isAuthenticated()) {
      promises.push(
        firebaseService.deleteProject(id).catch(e => console.warn('[UnifiedSync] Firebase deleteProject failed:', e))
      );
    }

    if (this.localSyncEnabled) {
      promises.push(
        syncService.deleteProjectFolder(id, projectName).catch(e => console.warn('[UnifiedSync] Local deleteProject failed:', e))
      );
    }

    await Promise.all(promises);
  }

  async fullSync(projects: Project[], onProgress?: (current: number, total: number, status: string) => void): Promise<void> {
    const total = projects.length;
    let current = 0;

    for (const project of projects) {
      current++;
      onProgress?.(current, total, `Syncing ${project.name}...`);
      await this.syncProject(project);

      // Sync notes for this project
      const projectNotes = await db.notes.where('projectId').equals(project.id).toArray();
      for (const note of projectNotes) {
        await this.syncNote(note, project.name);
      }
    }

    onProgress?.(total, total, 'Sync complete!');
  }

  async downloadNotesFromCloud(): Promise<{ notes: Note[], projects: Project[] } | null> {
    if (!googleDriveSyncService.isAuthenticated()) {
      return null;
    }

    try {
      const bundle = await googleDriveSyncService.downloadBundle();
      if (bundle) {
        return bundle;
      }
    } catch (e) {
      console.warn('[UnifiedSync] Download bundle failed:', e);
    }

    return null;
  }

  startRealtimeListeners(): void {
    if (this.cloudSyncEnabled && firebaseService.isAuthenticated()) {
      console.log('[UnifiedSync] Starting realtime listeners...');
      
      // Notes subscription
      const notesUnsubscribe = firebaseService.subscribeToAllNotes((remoteNotes) => {
        console.log('[UnifiedSync] Realtime notes update:', remoteNotes.length);
        const { useStore } = import.meta.glob('../store/useStore.ts', { eager: true }) as any;
        const store = useStore.useStore;
        
        // Merge strategy: remote takes precedence for now, but in production we'd use conflict resolution
        // For REBORN_3, let's ensure remote updates reflect in UI
        if (store) {
          store.getState().setNotes(remoteNotes as Note[]);
        }
      });
      this.realtimeListeners.push(notesUnsubscribe);

      // Projects subscription
      const projectsUnsubscribe = firebaseService.subscribeToProjects((remoteProjects) => {
        console.log('[UnifiedSync] Realtime projects update:', remoteProjects.length);
        const { useStore } = import.meta.glob('../store/useStore.ts', { eager: true }) as any;
        const store = useStore.useStore;
        
        if (store) {
          store.getState().setProjects(remoteProjects as Project[]);
        }
      });
      this.realtimeListeners.push(projectsUnsubscribe);
    }
  }

  stopRealtimeListeners(): void {
    this.realtimeListeners.forEach(unsubscribe => unsubscribe());
    this.realtimeListeners = [];
  }
}

export const unifiedSyncService = new UnifiedSyncService();
export { SyncOrchestrator } from '../domain/sync/SyncOrchestrator';

// Helper functions for conflict resolution (used in tests)
export function getMostRecentNote(note1: Note, note2: Note): Note {
  // First check microsecond timestamp
  if (note1.timestampMicroseconds && note2.timestampMicroseconds) {
    if (note1.timestampMicroseconds !== note2.timestampMicroseconds) {
      return note1.timestampMicroseconds > note2.timestampMicroseconds ? note1 : note2;
    }
    // If equal, use version as tiebreaker
    return (note1.version || 0) >= (note2.version || 0) ? note1 : note2;
  }

  // Fallback to updatedAt
  const time1 = note1.updatedAt || note1.createdAt || 0;
  const time2 = note2.updatedAt || note2.createdAt || 0;
  return time1 >= time2 ? note1 : note2;
}

export function isNoteDirtyOrPending(note: Note): boolean {
  return note.isDirty === true || note.syncStatus === 'pending';
}
