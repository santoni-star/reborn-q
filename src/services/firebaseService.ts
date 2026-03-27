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

// Firebase configuration with environment variables validation
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate that all required environment variables are present
const requiredEnvVars = Object.keys(firebaseConfig);
const missingEnvVars = requiredEnvVars.filter(key => !import.meta.env[key]);

if (missingEnvVars.length > 0) {
  console.error('[Firebase] Missing environment variables:', missingEnvVars.join(', '));
}

// Initialize Firebase
let app: ReturnType<typeof initializeApp> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

try {
  // Check if environment variables are available (Vite SSR context)
  if (typeof window === 'undefined' && !import.meta.env.VITE_FIREBASE_API_KEY) {
    console.warn('[Firebase] Running in SSR mode or missing Firebase config');
  } else {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log("[Firebase] Auth initialized");
    
    // Set persistence to local to ensure session survives reloads and redirects
    setPersistence(auth, browserLocalPersistence).catch(console.error);
    
    db = getFirestore(app);
    console.log("[Firebase] Firestore initialized");
  }
  
  if (typeof window !== 'undefined') {
    (window as { firebase_auth?: typeof auth; firebaseService?: FirebaseService }).firebase_auth = auth;
  }
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');
provider.addScope('https://www.googleapis.com/auth/drive.appdata');

// Use select_account and ensure consistent auth experience
provider.setCustomParameters({
  prompt: 'select_account'
});

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
    if (typeof window !== 'undefined') {
      (window as { firebaseService?: FirebaseService }).firebaseService = this;
      
      // Only attach listener if auth is initialized
      if (auth) {
        auth.onAuthStateChanged((user: User | null) => {
          console.log("[Firebase] Auth State Update:", user?.email || "null");
          this.currentUser = user;
        });
      }
    }
  }

  public async handleRedirectResult(): Promise<User | null> {
    if (this.redirectPromise) return this.redirectPromise;

    this.redirectPromise = (async () => {
        try {
            // Small delay to let Firebase initialize fully on mobile
            await new Promise(r => setTimeout(r, 500));
            
            const result = await getRedirectResult(auth);
            if (result) {
                console.log("[Firebase] Redirect success:", result.user.email);
                const credential = GoogleAuthProvider.credentialFromResult(result);
                const token = credential?.accessToken;
                
                if (token) {
                    console.log("[Firebase] Captured token from redirect credential");
                    if (this.onTokenReceived) this.onTokenReceived(token);
                    else this.pendingToken = token;
                }
                
                this.currentUser = result.user;
                return result.user;
            }
        } catch (error: any) {
            console.error("[Firebase] Redirect error:", error.code, error.message);
        }
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
    try {
        console.log("[Firebase] Attempting signInWithPopup...");
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const token = credential?.accessToken;
        
        if (token && this.onTokenReceived) {
            this.onTokenReceived(token);
        }
        
        this.currentUser = result.user;
        return result.user;
    } catch (error: any) {
        console.warn("[Firebase] Popup failed, trying Redirect...", error.code);
        // If popup is blocked or fails, fall back to redirect
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
            await signInWithRedirect(auth, provider);
            return null;
        }
        throw error;
    }
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<User | null> {
    const result = await signInWithEmailAndPassword(auth, email, password);
    this.currentUser = result.user;
    return result.user;
  }

  async createUserWithEmailAndPassword(email: string, password: string, displayName?: string): Promise<User | null> {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(result.user, { displayName });
    this.currentUser = result.user;
    return result.user;
  }

  async signOut(): Promise<void> {
    await signOut(auth);
    this.currentUser = null;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  subscribeToAuth(callback: (user: User | null) => void): Unsubscribe {
    return auth.onAuthStateChanged(callback);
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  private cleanData(data: any): any {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      } else if (cleaned[key] !== null && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
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
    if (!this.isAuthenticated()) throw new Error('User not authenticated');
    if (!navigator.onLine) return note.id || `local-${Date.now()}`;
    
    const noteData = this.cleanData({ ...note, userId: this.currentUser!.uid, createdAt: note.createdAt || Date.now(), updatedAt: Date.now() });
    try {
        const docRef = await this.withTimeout(addDoc(collection(db!, 'notes'), noteData));
        return docRef.id;
    } catch (error: any) {
        console.error("[Firebase] addNote Error:", error);
        throw error;
    }
  }

  async bulkAddNotes(notes: Note[]): Promise<void> {
    if (!this.isAuthenticated() || notes.length === 0) return;
    const batch = writeBatch(db);
    
    notes.forEach(note => {
        const noteRef = doc(collection(db!, 'notes'));
        batch.set(noteRef, this.cleanData({ 
            ...note, 
            userId: this.currentUser!.uid, 
            updatedAt: Date.now() 
        }));
    });

    try {
        await this.withTimeout(batch.commit());
    } catch (error: any) {
        console.error("[Firebase] bulkAddNotes Error:", error);
        throw error;
    }
  }

  async updateNote(noteId: string, updates: Partial<Note>, docId?: string): Promise<void> {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');
    if (!navigator.onLine) return;
    
    const cleanedUpdates = this.cleanData(updates);
    const targetDocId = docId || noteId;

    try {
      const noteRef = doc(db!, 'notes', targetDocId);
      // ПЕРЕХІД НА UPSERT: setDoc з merge: true не видає помилку, якщо документа немає
      await this.withTimeout(setDoc(noteRef, { 
          ...cleanedUpdates, 
          userId: this.currentUser!.uid,
          updatedAt: Date.now() 
      }, { merge: true }));
    } catch (e: any) {
      if (docId) throw e;
      
      const q = query(collection(db!, 'notes'), where('userId', '==', this.currentUser!.uid), where('id', '==', noteId));
      const snapshot = await this.withTimeout(getDocs(q));
      if (!snapshot.empty) {
        await this.withTimeout(setDoc(doc(db!, 'notes', snapshot.docs[0].id), { 
            ...cleanedUpdates, 
            userId: this.currentUser!.uid,
            updatedAt: Date.now() 
        }, { merge: true }));
      } else {
        throw e;
      }
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');
    
    try {
      await this.withTimeout(deleteDoc(doc(db!, 'notes', noteId)), 3000);
    } catch {}

    const q = query(collection(db!, 'notes'), where('userId', '==', this.currentUser!.uid), where('id', '==', noteId));
    const snapshot = await this.withTimeout(getDocs(q), 3000);
    
    const deletePromises = snapshot.docs.map(doc => this.withTimeout(deleteDoc(doc.ref), 2000));
    await Promise.allSettled(deletePromises);
  }

  async getNoteById(noteId: string): Promise<FirebaseNote | null> {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');
    try {
        const q = query(collection(db!, 'notes'), where('userId', '==', this.currentUser!.uid), where('id', '==', noteId));
        const snapshot = await this.withTimeout(getDocs(q), 4000);
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        const data = doc.data();
        return { ...data, id: data.id || doc.id, firebaseId: doc.id } as FirebaseNote;
    } catch (e) {
        console.warn("[Firebase] getNoteById failed or timed out:", e);
        return null;
    }
  }

  async updateProject(projectId: string, updates: any): Promise<void> {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');
    if (!navigator.onLine) return;
    
    const cleanedUpdates = this.cleanData(updates);
    try {
        const q = query(collection(db!, 'projects'), where('userId', '==', this.currentUser!.uid), where('id', '==', projectId));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            await updateDoc(doc(db!, 'projects', docId), { ...cleanedUpdates, updatedAt: Date.now() });
        } else {
            // Create project entry if it doesn't exist in Firestore
            await addDoc(collection(db!, 'projects'), this.cleanData({ 
                ...cleanedUpdates, 
                id: projectId, 
                userId: this.currentUser!.uid,
                updatedAt: Date.now() 
            }));
        }
    } catch (e) {
        console.error("Firebase updateProject failed:", e);
    }
  }

  async getProjects(): Promise<any[]> {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');
    const q = query(
      collection(db!, 'projects'), 
      where('userId', '==', this.currentUser!.uid),
      orderBy('updatedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const projects: any[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      projects.push({ ...data, id: data.id || doc.id });
    });
    return projects;
  }

  async getNotes(): Promise<FirebaseNote[]> {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');
    const q = query(
      collection(db!, 'notes'), 
      where('userId', '==', this.currentUser!.uid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const notes: FirebaseNote[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      notes.push({ ...data, id: data.id || doc.id, firebaseId: doc.id } as FirebaseNote);
    });
    return notes;
  }

  async deleteProject(projectId: string): Promise<void> {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');
    
    try {
        const q = query(collection(db!, 'projects'), where('userId', '==', this.currentUser!.uid), where('id', '==', projectId));
        const snapshot = await getDocs(q);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log(`[Firebase] Deleted project: ${projectId}`);
    } catch (error) {
        console.error("[Firebase] Error deleting project:", error);
        throw error;
    }
  }

  subscribeToNotes(projectId: string, callback: (notes: FirebaseNote[]) => void): Unsubscribe {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');

    const subKey = `notes_${projectId}`;
    if (this.activeSubscriptions.has(subKey)) {
        this.activeSubscriptions.get(subKey)!();
    }

    const q = query(collection(db!, 'notes'), where('userId', '==', this.currentUser!.uid), where('projectId', '==', projectId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes: FirebaseNote[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({ ...data, id: data.id || doc.id, firebaseId: doc.id } as FirebaseNote);
      });
      callback(notes);
    });

    this.activeSubscriptions.set(subKey, unsubscribe);
    return unsubscribe;
  }

  subscribeToAllNotes(callback: (notes: FirebaseNote[]) => void): Unsubscribe {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');

    const subKey = 'all_notes';
    if (this.activeSubscriptions.has(subKey)) {
        this.activeSubscriptions.get(subKey)!();
    }

    const q = query(collection(db!, 'notes'), where('userId', '==', this.currentUser!.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notes: FirebaseNote[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({ ...data, id: data.id || doc.id, firebaseId: doc.id } as FirebaseNote);
      });
      callback(notes);
    });

    this.activeSubscriptions.set(subKey, unsubscribe);
    return unsubscribe;
  }

  subscribeToProjects(callback: (projects: any[]) => void): Unsubscribe {
    if (!this.isAuthenticated()) throw new Error('User not authenticated');

    const subKey = 'all_projects';
    if (this.activeSubscriptions.has(subKey)) {
        this.activeSubscriptions.get(subKey)!();
    }

    const q = query(
      collection(db!, 'projects'), 
      where('userId', '==', this.currentUser!.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projects: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        projects.push({ ...data, id: data.id || doc.id });
      });
      callback(projects);
    }, (error) => {
      console.error("[Firebase] subscribeToProjects error:", error);
    });

    this.activeSubscriptions.set(subKey, unsubscribe);
    return unsubscribe;
  }
}

export const firebaseService = new FirebaseService();
