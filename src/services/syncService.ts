import { get, set } from 'idb-keyval';
import type { Note, Project } from '../types/entities';
import db from './db';

const DIR_HANDLE_KEY = 'dev_voice_root_dir';
const FILE_HASHES_KEY = 'dev_voice_file_hashes';

async function calculateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const syncService = {
  async isSupported() {
    return 'showDirectoryPicker' in window;
  },

  async connectFolder() {
    try {
      const handle = await window.showDirectoryPicker({
        mode: 'readwrite',
      });
      await set(DIR_HANDLE_KEY, handle);
      return true;
    } catch (e) {
      console.error('Failed to connect folder:', e);
      return false;
    }
  },

  async getStoredHandle() {
    return await get<FileSystemDirectoryHandle>(DIR_HANDLE_KEY);
  },

  async ensurePermission(request = true) {
    const handle = await this.getStoredHandle();
    if (!handle) return false;

    const options: FileSystemHandlePermissionDescriptor = { mode: 'readwrite' };
    if ((await handle.queryPermission(options)) === 'granted') return true;
    if (request && (await handle.requestPermission(options)) === 'granted') return true;

    return false;
  },

  async reconnect() {
    return await this.ensurePermission(true);
  },

  async loadNotesFromFolder(): Promise<{ notes: Note[]; projects: Project[] }> {
    if (!(await this.ensurePermission(false))) return { notes: [], projects: [] };
    const dirHandle = (await get(DIR_HANDLE_KEY)) as FileSystemDirectoryHandle;
    if (!dirHandle) return { notes: [], projects: [] };

    const notes: Note[] = [];
    const projects: Project[] = [];
    const newNotesCache: Record<string, Note[]> = {};

    let totalFilesFound = 0;

    try {
      // @ts-ignore
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'directory') {
          const subDir = entry as FileSystemDirectoryHandle;
          const dirName = subDir.name;

          // Skip hidden/system directories (starting with .)
          if (dirName.startsWith('.')) continue;

          // ID is usually the dirname unless it's a System dir
          let projectId = dirName;

          if (dirName === 'System') {
              try {
                // @ts-ignore
                for await (const systemEntry of subDir.values()) {
                  if (systemEntry.kind === 'directory') {
                    const systemDirName = systemEntry.name;
                    let systemProjectId = systemDirName;

                    if (systemDirName === 'Inbox') systemProjectId = '1';
                    else if (systemDirName === 'Global_Digests') systemProjectId = 'global-digest';

                    const systemSubDir = systemEntry as FileSystemDirectoryHandle;

                    if (systemDirName === 'Inbox' || systemDirName === 'Global_Digests') {
                      const projectNotes: Note[] = [];
                      try {
                        // @ts-ignore
                        for await (const projectEntry of systemSubDir.values()) {
                          if (projectEntry.kind === 'file' && projectEntry.name.endsWith('.md')) {
                            totalFilesFound++;
                            try {
                              const file = await (projectEntry as FileSystemFileHandle).getFile();
                              const text = await file.text();
                              const note = this.parseMarkdownNote(text, systemProjectId);
                              if (note) {
                                note.projectId = systemProjectId;
                                projectNotes.push(note);
                              }
                            } catch (e) {}
                          } else if (projectEntry.kind === 'directory') {
                            const dateDir = projectEntry as FileSystemDirectoryHandle;
                            try {
                              // @ts-ignore
                              for await (const fileEntry of dateDir.values()) {
                                if (fileEntry.kind === 'file' && fileEntry.name.endsWith('.md')) {
                                  totalFilesFound++;
                                  try {
                                    const file = await (fileEntry as FileSystemFileHandle).getFile();
                                    const text = await file.text();
                                    const note = this.parseMarkdownNote(text, systemProjectId);
                                    if (note) {
                                      note.projectId = systemProjectId;
                                      projectNotes.push(note);
                                    }
                                    } catch (e) {}
                                }
                              }
                            } catch (e) {}
                          }
                        }
                      } catch (e) {}

                      notes.push(...projectNotes);
                      newNotesCache[systemProjectId] = projectNotes;
                    }
                  }
                }
              } catch (e) {}
            }
            // Normal Project Directory
            else {
              let projectMetadata: Partial<Project> = {};
              try {
                  const metadataFile = await subDir.getFileHandle('.metadata.json', { create: false }).catch(() => null);
                  if (metadataFile) {
                      const file = await metadataFile.getFile();
                      projectMetadata = JSON.parse(await file.text());
                      if (projectMetadata.id) projectId = projectMetadata.id;
                  }
              } catch (e) {}

              projects.push({
                  id: projectId,
                  name: projectMetadata.name || dirName,
                  createdAt: projectMetadata.createdAt || Date.now(),
                  updatedAt: projectMetadata.updatedAt || Date.now(),
                  color: projectMetadata.color,
                  knowledge: projectMetadata.knowledge
              });

              const projectNotes: Note[] = [];
              try {
                // @ts-ignore
                for await (const projectEntry of subDir.values()) {
                  if (projectEntry.kind === 'file' && projectEntry.name.endsWith('.md')) {
                    totalFilesFound++;
                    try {
                      const file = await (projectEntry as FileSystemFileHandle).getFile();
                      const text = await file.text();
                      const note = this.parseMarkdownNote(text, projectId);
                      if (note) projectNotes.push(note);
                    } catch (e) {}
                  } else if (projectEntry.kind === 'directory') {
                    const dateDir = projectEntry as FileSystemDirectoryHandle;
                    // Skip hidden dirs
                    if (dateDir.name.startsWith('.')) continue;
                    try {
                      // @ts-ignore
                      for await (const fileEntry of dateDir.values()) {
                        if (fileEntry.kind === 'file' && fileEntry.name.endsWith('.md')) {
                          totalFilesFound++;
                          try {
                            const file = await (fileEntry as FileSystemFileHandle).getFile();
                            const text = await file.text();
                            const note = this.parseMarkdownNote(text, projectId);
                            if (note) projectNotes.push(note);
                          } catch (e) {}
                        }
                      }
                    } catch (e) {}
                  }
                }
              } catch (e) {}
              notes.push(...projectNotes);
            }
        }
      }
    } catch (e) {
      console.error('[Sync] Error loading notes:', e);
    }

    console.log(`[Sync] Loaded ${notes.length} notes from ${projects.length + 1} project folders.`);
    return { notes, projects };
  },

  parseMarkdownNote(content: string, projectId: string): Note | null {
    try {
      const match = content.match(/^---([\s\S]*?)---\n([\s\S]*)$/);
      if (!match) return null;

      const yaml = match[1];
      const body = match[2].trim();

      const metadata: Record<string, string> = {};
      yaml.split('\n').forEach(line => {
        const [key, ...val] = line.split(':');
        if (key && val) metadata[key.trim()] = val.join(':').trim();
      });

      let tags: string[] = [];
      if (metadata.tags) {
        tags = metadata.tags.replace(/[[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean);
      }

      return {
        id: metadata.id || Date.now().toString(),
        projectId: projectId,
        title: metadata.title || 'Untitled',
        type: (metadata.type || 'generic') as any,
        color: metadata.color || undefined,
        completed: metadata.completed === 'true',
        content: body,
        tags: tags,
        createdAt: metadata.created ? new Date(metadata.created).getTime() : Date.now(),
        contentHash: metadata.hash || undefined
      };
    } catch (e) {
      return null;
    }
  },

  async getProjectFolderName(projectId: string): Promise<string> {
    if (projectId === '1' || projectId === 'Inbox') return 'System/Inbox';
    if (projectId === 'global-digest') return 'System/Global_Digests';
    
    const project = await db.projects.get(projectId);
    if (project && project.name) {
        return project.name.replace(/[<>:"/\\|?*]/g, '-').trim() || projectId;
    }
    return projectId;
  },

  async syncNoteFile(note: Note) {
    if (!(await this.ensurePermission(false))) return;
    const dirHandle = (await get(DIR_HANDLE_KEY)) as FileSystemDirectoryHandle;
    if (!dirHandle) return;

    try {
      const transliterate = (text: string) => {
        const map: Record<string, string> = {
          'а':'a','б':'b','в':'v','г':'g','ґ':'g','д':'d','е':'e','є':'ye','ж':'zh','з':'z','и':'y','і':'i','ї':'yi','й':'y',
          'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts',
          'ч':'ch','ш':'sh','щ':'shch','ь':'','ю':'yu','я':'ya'
        };
        if (!text) return 'untitled';
        return text.toLowerCase().split('').map(c => map[c] || (/[a-z0-9]/.test(c) ? c : '-')).join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
      };

      const targetFolderName = await this.getProjectFolderName(note.projectId);
      let projectHandle;

      if (targetFolderName.startsWith('System/')) {
          const systemHandle = await dirHandle.getDirectoryHandle('System', { create: true });
          const subDirName = targetFolderName.substring('System/'.length);
          projectHandle = await systemHandle.getDirectoryHandle(subDirName, { create: true });
      } else {
          projectHandle = await dirHandle.getDirectoryHandle(targetFolderName, { create: true });
      }

      const safeTitle = transliterate(note.title || 'untitled').substring(0, 50);
      const fileName = `${safeTitle}_${note.id.slice(-4)}.md`;
      const fileKey = `${targetFolderName}/${fileName}`;

      const fileContent = `---\nid: ${note.id}\ntitle: ${note.title}\ntype: ${note.type}\n${note.color ? `color: ${note.color}\n` : ''}completed: ${note.completed || false}\ncreated: ${new Date(note.createdAt).toISOString()}\ntags: [${note.tags.join(', ')}]\n---\n\n${note.content}\n`;

      const fileHandle = await projectHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(fileContent);
      await writable.close();

      const newHash = await calculateHash(fileContent);
      const storedHashes = await get(FILE_HASHES_KEY) || {};
      storedHashes[fileKey] = newHash;
      await set(FILE_HASHES_KEY, storedHashes);

      console.log(`[Sync] Written ${fileName} to /${targetFolderName}`);
    } catch (e) {
      console.error(`[Sync] Error syncing note ${note.id}:`, e);
    }
  },

  async deleteNoteFile(note: Note) {
    if (!(await this.ensurePermission(false))) return;
    const dirHandle = (await get(DIR_HANDLE_KEY)) as FileSystemDirectoryHandle;
    if (!dirHandle) return;

    try {
        const targetFolderName = await this.getProjectFolderName(note.projectId);
        let projectHandle;

        if (targetFolderName.startsWith('System/')) {
            const systemHandle = await dirHandle.getDirectoryHandle('System').catch(() => null);
            if (!systemHandle) return;
            const subDirName = targetFolderName.substring('System/'.length);
            projectHandle = await systemHandle.getDirectoryHandle(subDirName).catch(() => null);
        } else {
            projectHandle = await dirHandle.getDirectoryHandle(targetFolderName).catch(() => null);
        }
        if (!projectHandle) return;

        for await (const entry of projectHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                const file = await (entry as FileSystemFileHandle).getFile();
                const text = await file.text();
                if (text.includes(`id: ${note.id}`)) {
                    await projectHandle.removeEntry(entry.name);
                    console.log(`[Sync] Deleted note ${note.id} from ${targetFolderName}`);
                    return;
                }
            }
        }
    } catch (e) {
        console.error('[Sync] Error deleting note file:', e);
    }
  },

  async syncProjectMetadata(project: Project) {
    if (!(await this.ensurePermission(false))) return;
    const dirHandle = (await get(DIR_HANDLE_KEY)) as FileSystemDirectoryHandle;
    if (!dirHandle) return;

    try {
        const folderName = await this.getProjectFolderName(project.id);
        if (folderName.startsWith('System/')) return; // Metadata not needed for system dirs

        const projectHandle = await dirHandle.getDirectoryHandle(folderName, { create: true });
        const metadata = {
            id: project.id,
            name: project.name,
            color: project.color,
            knowledge: project.knowledge,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt
        };

        const fileHandle = await projectHandle.getFileHandle('.metadata.json', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(metadata, null, 2));
        await writable.close();
    } catch (e) {
        console.error('Error syncing project metadata:', e);
    }
  },

  async syncNotesBulk(notes: Note[]) {
    if (!(await this.ensurePermission(false))) return;
    const dirHandle = (await get(DIR_HANDLE_KEY)) as FileSystemDirectoryHandle;
    if (!dirHandle) return;

    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < notes.length; i += batchSize) {
      const batch = notes.slice(i, i + batchSize);
      await Promise.all(batch.map(note => this.syncNoteFile(note)));
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  },

  async deleteProjectFolder(projectId: string, projectName: string) {
    const dirHandle = (await get(DIR_HANDLE_KEY)) as FileSystemDirectoryHandle;
    if (!dirHandle) return;

    try {
      if (projectId === 'global-digest') {
          const systemHandle = await dirHandle.getDirectoryHandle('System', { create: false }).catch(() => null);
          if (systemHandle) await systemHandle.removeEntry('Global_Digests', { recursive: true }).catch(() => null);
      } else if (projectId === '1') {
          const systemHandle = await dirHandle.getDirectoryHandle('System', { create: false }).catch(() => null);
          if (systemHandle) await systemHandle.removeEntry('Inbox', { recursive: true }).catch(() => null);
      } else {
          // Use projectName if available, otherwise fallback to id (sanitized)
          const folderName = projectName.replace(/[<>:"/\\|?*]/g, '-').trim() || projectId;
          await dirHandle.removeEntry(folderName, { recursive: true }).catch(async () => {
              // Fallback to id if projectName folder not found
              await dirHandle.removeEntry(projectId, { recursive: true }).catch(() => null);
          });
      }
    } catch (e) {
      console.error('Error deleting project folder:', e);
    }
  },
};
