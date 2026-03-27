import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import type { Note } from '../types/entities';

// Firebase configuration - Hardcoded for reliability in REBORN_3
const firebaseConfig = {
  apiKey: "AIzaSyCRQVWYOz45R8IZhM4IvD7lKxxjL5xAGiA",
  authDomain: "reborn-2-reborn-8856.firebaseapp.com",
  projectId: "reborn-2-reborn-8856",
  storageBucket: "reborn-2-reborn-8856.firebasestorage.app",
  messagingSenderId: "587805249241",
  appId: "1:587805249241:web:0e81cdfbb078e8997b38c8"
};

// Initialize Firebase
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

try {
  if (typeof window !== 'undefined') {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    db = getFirestore(app);
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.appdata');
provider.setCustomParameters({ prompt: 'select_account' });

export interface FirebaseNote extends Note {
  firebaseId: string;
}

class FirebaseService {
  private currentUser: User | null = null;
  private onTokenReceived: ((token: string) => void) | null = null;
  private pendingToken: string | null = null;
  private activeSubscriptions: Map<string, Unsubscribe> = new Map();
  private redirectPromise: Promise<User | null> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && auth) {
      auth.onAuthStateChanged((user: User | null) => {
        this.currentUser = user;
      });
    }
  }

  public async handleRedirectResult(): Promise<User | null> {
    if (this.redirectPromise) return this.redirectPromise;
    this.redirectPromise = (async () => {
        try {
            await new Promise(r => setTimeout(r, 500));
            if (!auth) return null;
            const result = await getRedirectResult(auth);
            if (result) {
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential?.accessToken;
                if (token) {
                    if (this.onTokenReceived) this.onTokenReceived(token);
                    else this.pendingToken = token;
                }
                this.currentUser = result.user;
                return result.user;
            }
        } catch (error) { console.error("[Firebase] Redirect error:", error); }
        return null;
    })();
    return this.redirectPromise;
  }

  public setTokenCallback(callback: (token: string) => void) {
      this.onTokenReceived = callback;
      if (this.pendingToken) {
          callback(this.pendingToken);
          this.pendingToken = null;
      }
  }

  async signInWithGoogle(): Promise<User | null> {
    if (!auth) return null;
    try {
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        if (token && this.onTokenReceived) this.onTokenReceived(token);
        this.currentUser = result.user;
        return result.user;
    } catch (error: any) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            await signInWithRedirect(auth, provider);
            return null;
        }
        throw error;
    }
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<User | null> {
    if (!auth) return null;
    const result = await signInWithEmailAndPassword(auth, email, password);
    this.currentUser = result.user;
    return result.user;
  }

  async createUserWithEmailAndPassword(email: string, password: string, displayName?: string): Promise<User | null> {
    if (!auth) return null;
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(result.user, { displayName });
    this.currentUser = result.user;
    return result.user;
  }

  async signOut(): Promise<void> {
    if (auth) await signOut(auth);
    this.currentUser = null;
  }

  getCurrentUser(): User | null { return this.currentUser; }

  subscribeToAuth(callback: (user: User | null) => void): Unsubscribe | null {
    if (!auth) return null;
    return auth.onAuthStateChanged(callback);
  }

  isAuthenticated(): boolean { return this.currentUser !== null; }

  private cleanData(data: any): any {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) delete cleaned[key];
      else if (cleaned[key] !== null && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
        cleaned[key] = this.cleanData(cleaned[key]);
      }
    });
    return cleaned;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firebase Timeout')), timeoutMs))
    ]);
  }

  async addNote(note: Omit<Note, 'id'> & { id?: string }): Promise<string> {
    if (!this.isAuthenticated() || !db) throw new Error('Not authenticated or no DB');
    const noteData = this.cleanData({ ...note, userId: this.currentUser!.uid, createdAt: note.createdAt || Date.now(), updatedAt: Date.now() });
    const docRef = await this.withTimeout(addDoc(collection(db, 'notes'), noteData));
    return docRef.id;
  }

  async bulkAddNotes(notes: Note[]): Promise<void> {
    if (!this.isAuthenticated() || notes.length === 0 || !db) return;
    const batch = writeBatch(db);
    notes.forEach(note => {
        const noteRef = doc(collection(db!, 'notes'));
        batch.set(noteRef, this.cleanData({ ...note, userId: this.currentUser!.uid, updatedAt: Date.now() }));
    });
    await this.withTimeout(batch.commit());
  }

  async updateNote(noteId: string, updates: Partial<Note>, docId?: string): Promise<void> {
    if (!this.isAuthenticated() || !db) throw new Error('Not authenticated or no DB');
    const cleanedUpdates = this.cleanData(updates);
    const noteRef = doc(db, 'notes', docId || noteId);
    await this.withTimeout(setDoc(noteRef, { ...cleanedUpdates, userId: this.currentUser!.uid, updatedAt: Date.now() }, { merge: true }));
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!this.isAuthenticated() || !db) return;
    try { await this.withTimeout(deleteDoc(doc(db, 'notes', noteId)), 3000); } catch {}
    const q = query(collection(db, 'notes'), where('userId', '==', this.currentUser!.uid), where('id', '==', noteId));
    const snapshot = await this.withTimeout(getDocs(q), 3000);
    await Promise.allSettled(snapshot.docs.map(doc => deleteDoc(doc.ref)));
  }

  async getNoteById(noteId: string): Promise<FirebaseNote | null> {
    if (!this.isAuthenticated() || !db) return null;
    const q = query(collection(db, 'notes'), where('userId', '==', this.currentUser!.uid), where('id', '==', noteId));
    const snapshot = await this.withTimeout(getDocs(q), 4000);
    if (snapshot.empty) return null;
    const d = snapshot.docs[0];
    const data = d.data();
    return { ...data, id: data.id || d.id, firebaseId: d.id } as FirebaseNote;
  }

  async updateProject(projectId: string, updates: any): Promise<void> {
    if (!this.isAuthenticated() || !db) return;
    const cleanedUpdates = this.cleanData(updates);
    const q = query(collection(db, 'projects'), where('userId', '==', this.currentUser!.uid), where('id', '==', projectId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        await updateDoc(doc(db, 'projects', snapshot.docs[0].id), { ...cleanedUpdates, updatedAt: Date.now() });
    } else {
        await addDoc(collection(db, 'projects'), this.cleanData({ ...cleanedUpdates, id: projectId, userId: this.currentUser!.uid, updatedAt: Date.now() }));
    }
  }

  async getProjects(): Promise<any[]> {
    if (!this.isAuthenticated() || !db) return [];
    const q = query(collection(db, 'projects'), where('userId', '==', this.currentUser!.uid), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.data().id || d.id }));
  }

  async getNotes(): Promise<FirebaseNote[]> {
    if (!this.isAuthenticated() || !db) return [];
    const q = query(collection(db, 'notes'), where('userId', '==', this.currentUser!.uid), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ ...d.data(), id: d.data().id || d.id, firebaseId: d.id } as FirebaseNote));
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!this.isAuthenticated() || !db) return;
    const q = query(collection(db, 'projects'), where('userId', '==', this.currentUser!.uid), where('id', '==', projectId));
    const snapshot = await getDocs(q);
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
  }

  subscribeToNotes(projectId: string, callback: (notes: FirebaseNote[]) => void): Unsubscribe {
    if (!this.isAuthenticated() || !db) throw new Error('Not authenticated');
    const q = query(collection(db, 'notes'), where('userId', '==', this.currentUser!.uid), where('projectId', '==', projectId));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ ...d.data(), id: d.data().id || d.id, firebaseId: d.id } as FirebaseNote)));
    });
  }

  subscribeToAllNotes(callback: (notes: FirebaseNote[]) => void): Unsubscribe {
    if (!this.isAuthenticated() || !db) throw new Error('Not authenticated');
    const q = query(collection(db, 'notes'), where('userId', '==', this.currentUser!.uid));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ ...d.data(), id: d.data().id || d.id, firebaseId: d.id } as FirebaseNote)));
    });
  }

  subscribeToProjects(callback: (projects: any[]) => void): Unsubscribe {
    if (!this.isAuthenticated() || !db) throw new Error('Not authenticated');
    const q = query(collection(db, 'projects'), where('userId', '==', this.currentUser!.uid));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(d => ({ ...d.data(), id: d.data().id || d.id })));
    });
  }
}

export const firebaseService = new FirebaseService();
