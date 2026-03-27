import { ISyncProvider } from '../ISyncProvider';
import { db } from '../../../services/db';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

export class FirebaseAdapter implements ISyncProvider {
  async uploadNote(noteId: string, content: string): Promise<void> {
    console.log('[FirebaseAdapter] Uploading to Firestore...');
    // Тут буде реальна логіка з firebaseService.ts
    const firestore = getFirestore();
    await setDoc(doc(firestore, 'notes', noteId), { content, updatedAt: Date.now() });
  }
  async downloadNote(noteId: string): Promise<string> { 
    // Реалізація завантаження...
    return ''; 
  }
  async deleteNote(noteId: string): Promise<void> { 
    // Реалізація видалення...
  }
}
