import Dexie, { type Table } from 'dexie';
import type { Note, Project, AppSettings } from '../types/entities';

export type NoteWithId = Note & {
  id: string;
};

export type ProjectWithId = Project & {
  id: string;
};

export interface Settings {
  id?: string;
  settings: AppSettings;
}

export interface SyncLog {
  id?: string;
  timestamp: number;
  operation: 'full_sync' | 'note_sync' | 'project_sync' | 'upload' | 'download';
  status: 'success' | 'error' | 'partial';
  details: {
    platform?: 'firebase' | 'googledrive' | 'local';
    notesCount?: number;
    fileSize?: number;
    duration?: number;
    error?: string;
    message?: string;
  };
  userId?: string;
}

export interface PendingSync {
  id?: number;
  entityType: 'note' | 'project';
  entityId: string;
  operation: 'add' | 'update' | 'delete';
  timestamp: number;
}

class AppDB extends Dexie {
  notes!: Table<NoteWithId>;
  projects!: Table<ProjectWithId>;
  settings!: Table<Settings>;
  syncLogs!: Table<SyncLog>;
  pendingSync!: Table<PendingSync>;

  constructor() {
    super('DevVoiceDB');
    this.version(1).stores({
      notes: '&id, title, content, projectId, createdAt, updatedAt, isFavorite',
      projects: '&id, name, description, createdAt, updatedAt'
    });

    // Upgrade to version 2 to add version and timestampMicroseconds fields
    this.version(2).stores({
      notes: '&id, title, content, projectId, createdAt, updatedAt, isFavorite, version, timestampMicroseconds',
      projects: '&id, name, description, createdAt, updatedAt'
    }).upgrade(trans => {
      // Initialize version and timestampMicroseconds for existing notes
      return trans.table('notes').toCollection().modify(note => {
        note.version = note.version || 1;
        note.timestampMicroseconds = note.timestampMicroseconds || Date.now() * 1000; // Convert to microseconds
      });
    });

    // Upgrade to version 3 to add settings table
    this.version(3).stores({
      notes: '&id, title, content, projectId, createdAt, updatedAt, isFavorite, version, timestampMicroseconds',
      projects: '&id, name, description, createdAt, updatedAt',
      settings: '&id' // Single settings record
    });

    // Upgrade to version 4 to add tag indexing for improved search performance
    this.version(4).stores({
      notes: '&id, title, content, *tags, projectId, createdAt, updatedAt, isFavorite, version, timestampMicroseconds',
      projects: '&id, name, description, createdAt, updatedAt',
      settings: '&id' // Single settings record
    });

    // Upgrade to version 6 to add syncStatus indexing
    this.version(6).stores({
      notes: '&id, title, content, *tags, projectId, createdAt, updatedAt, isFavorite, version, timestampMicroseconds, syncStatus',
      projects: '&id, name, description, createdAt, updatedAt',
      settings: '&id',
      syncLogs: '++id, timestamp, operation, status'
    });

    // Upgrade to version 7 to add pendingSync table
    this.version(7).stores({
      notes: '&id, title, content, *tags, projectId, createdAt, updatedAt, isFavorite, version, timestampMicroseconds, syncStatus',
      projects: '&id, name, description, createdAt, updatedAt',
      settings: '&id',
      syncLogs: '++id, timestamp, operation, status',
      pendingSync: '++id, entityType, entityId, operation, timestamp'
    });
  }

  async seedInitialData() {
    const projectsCount = await this.projects.count();
    if (projectsCount === 0) {
      await this.projects.add({
        id: '1',
        name: 'Default Project',
        description: 'Your first project',
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    // Initialize settings if they don't exist
    const settingsCount = await this.settings.count();
    if (settingsCount === 0) {
      await this.settings.add({
        id: 'app-settings',
        settings: {
          aiProvider: 'browser-native-extension',
          transcriptionProvider: 'browser',
          language: 'uk',
          fontSize: 'base',
          openaiKey: '',
          geminiKey: '',
          groqKey: '',
          googleAccessToken: '',
          autoSync: false,
          autoSyncAuth: true,
          disableExpansion: false,
          cloudSyncEnabled: false,
          localSyncEnabled: false,
          showDevInsight: false,
        }
      });
    }
  }

  async getSettings() {
    const settingsRecord = await this.settings.get('app-settings');
    return settingsRecord ? settingsRecord.settings : null;
  }

  async updateSettings(newSettings: AppSettings) {
    const existing = await this.settings.get('app-settings');
    if (existing) {
      await this.settings.update('app-settings', { settings: newSettings });
    } else {
      await this.settings.add({
        id: 'app-settings',
        settings: newSettings
      });
    }
  }

  async addSyncLog(log: Omit<SyncLog, 'id'>): Promise<string> {
    const id = await this.syncLogs.add(log);
    return id.toString();
  }

  async getLatestSyncLog(operation?: string): Promise<SyncLog | undefined> {
    let query = this.syncLogs.orderBy('timestamp');

    if (operation) {
      query = query.filter(log => log.operation === operation);
    }

    const logs = await query.reverse().limit(1).toArray();
    return logs[0];
  }

  async getSyncLogs(limit: number = 10, operation?: string): Promise<SyncLog[]> {
    let query = this.syncLogs.orderBy('timestamp');

    if (operation) {
      query = query.filter(log => log.operation === operation);
    }

    return await query.reverse().limit(limit).toArray();
  }

  async clearSyncLogs(): Promise<void> {
    await this.syncLogs.clear();
  }
}

export const db = new AppDB();

// Initialize the database and seed initial data
db.on('ready', async () => {
  await db.seedInitialData();
});

export default db;
