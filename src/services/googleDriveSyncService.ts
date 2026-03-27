// Google Drive synchronization service
import type { Note, Project } from '../types/entities';
import JSZip from 'jszip';

// Declare global for Google GIS
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

export class GoogleDriveSyncService {
  private accessToken: string | null = null;
  private folderCache: Record<string, string> = {};
  private readonly CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  async signIn(silent = false): Promise<any> {
    console.log("[GDrive] Starting Sign-In...", { silent, hasClientId: !!this.CLIENT_ID });
    
    if (!this.CLIENT_ID) {
        throw new Error("Google Client ID missing in .env");
    }

    return new Promise((resolve, reject) => {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.appdata',
          callback: (response: any) => {
            if (response.error) {
              console.error("[GDrive] Auth Error:", response);
              reject(response);
            } else {
              console.log("[GDrive] Auth Success");
              this.accessToken = response.access_token;
              resolve(response);
            }
          },
        });

        client.requestAccessToken({ prompt: silent ? '' : 'select_account' });
      } catch (e) {
        console.error("[GDrive] Failed to init TokenClient:", e);
        reject(e);
      }
    });
  }

  setToken(token: string) {
    this.accessToken = token;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async fetchDrive(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`https://www.googleapis.com/drive/v3/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`GDrive API Error: ${err.error?.message || response.statusText}`);
    }
    return response.json();
  }

  async getOrCreateDevVoiceFolder(): Promise<string> {
      return this.getOrCreateFolder('DevVoice');
  }

  async getOrCreateProjectFolder(parentId: string, name: string): Promise<string> {
      return this.getOrCreateFolder(name, parentId);
  }

  async getOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const cacheKey = parentId ? `${parentId}_${name}` : name;
    if (this.folderCache[cacheKey]) return this.folderCache[cacheKey];

    let q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) q += ` and '${parentId}' in parents`;

    const data = await this.fetchDrive(`files?q=${encodeURIComponent(q)}&fields=files(id)`);
    if (data.files && data.files.length > 0) {
      const id = data.files[0].id;
      this.folderCache[cacheKey] = id;
      return id;
    }

    const folder = await this.fetchDrive('files', {
      method: 'POST',
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : []
      })
    });
    this.folderCache[cacheKey] = folder.id;
    return folder.id;
  }

  async uploadNoteFile(folderId: string, note: Note): Promise<void> {
    const fileName = `${note.id}.json`;
    const content = JSON.stringify(note);

    const q = `name = '${fileName}' and '${folderId}' in parents and trashed = false`;
    const existing = await this.fetchDrive(`files?q=${encodeURIComponent(q)}&fields=files(id)`);
    
    let fileId;
    if (existing.files && existing.files.length > 0) {
      fileId = existing.files[0].id;
    } else {
      const meta = await this.fetchDrive('files', {
        method: 'POST',
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json'
        })
      });
      fileId = meta.id;
    }

    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: content
    });
  }

  async uploadProjectMetadata(folderId: string, project: Project): Promise<void> {
    const fileName = `project_metadata.json`;
    const content = JSON.stringify(project);

    const q = `name = '${fileName}' and '${folderId}' in parents and trashed = false`;
    const existing = await this.fetchDrive(`files?q=${encodeURIComponent(q)}&fields=files(id)`);
    
    let fileId;
    if (existing.files && existing.files.length > 0) {
      fileId = existing.files[0].id;
    } else {
      const meta = await this.fetchDrive('files', {
        method: 'POST',
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
          mimeType: 'application/json'
        })
      });
      fileId = meta.id;
    }

    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: content
    });
  }

  async uploadBundle(notes: Note[], projects: Project[]): Promise<void> {
    if (!this.accessToken) return;
    const zip = new JSZip();
    zip.file('notes.json', JSON.stringify(notes));
    zip.file('projects.json', JSON.stringify(projects));
    const content = await zip.generateAsync({ type: 'blob' });

    const rootId = await this.getOrCreateDevVoiceFolder();
    const fileName = 'dev_voice_bundle.zip';

    const q = `name = '${fileName}' and '${rootId}' in parents and trashed = false`;
    const existing = await this.fetchDrive(`files?q=${encodeURIComponent(q)}&fields=files(id)`);
    
    let fileId;
    if (existing.files && existing.files.length > 0) {
      fileId = existing.files[0].id;
    } else {
      const meta = await this.fetchDrive('files', {
        method: 'POST',
        body: JSON.stringify({
          name: fileName,
          parents: [rootId],
          mimeType: 'application/zip'
        })
      });
      fileId = meta.id;
    }

    await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/zip'
      },
      body: content
    });
  }

  async downloadBundle(): Promise<{ notes: Note[], projects: Project[] } | null> {
    if (!this.accessToken) return null;
    try {
        const rootId = await this.getOrCreateDevVoiceFolder();
        const q = `name = 'dev_voice_bundle.zip' and '${rootId}' in parents and trashed = false`;
        const existing = await this.fetchDrive(`files?q=${encodeURIComponent(q)}&fields=files(id)`);
        
        if (!existing.files || existing.files.length === 0) return null;
        
        const fileId = existing.files[0].id;
        const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': `Bearer ${this.accessToken}` }
        });
        
        if (!response.ok) return null;
        
        const blob = await response.blob();
        const zip = await JSZip.loadAsync(blob);
        
        const notesJson = await zip.file('notes.json')?.async('text');
        const projectsJson = await zip.file('projects.json')?.async('text');
        
        return {
            notes: notesJson ? JSON.parse(notesJson) : [],
            projects: projectsJson ? JSON.parse(projectsJson) : []
        };
    } catch (e) {
        console.error("[GDrive] Download bundle failed:", e);
        return null;
    }
  }

  async downloadAllData(): Promise<{ notes: Note[], projects: Project[] }> {
      // Fallback if bundle is missing - scan folders
      const notes: Note[] = [];
      const projects: Project[] = [];
      // ... implementation for individual files if needed ...
      return { notes, projects };
  }
}

export const googleDriveSyncService = new GoogleDriveSyncService();
