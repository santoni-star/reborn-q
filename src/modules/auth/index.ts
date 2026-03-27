import { firebaseService } from '../../services/firebaseService';
import type { User as FirebaseUser } from 'firebase/auth';

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  photoURL: string | null;
  createdAt: string;
}

export const authModule = {
  login: async (email: string, password: string): Promise<FirebaseUser | null> => {
    try {
      return await firebaseService.signInWithEmailAndPassword(email, password);
    } catch (error) {
      console.error('[AuthModule] Login failed:', error);
      throw error;
    }
  },

  signInWithGoogle: async (): Promise<FirebaseUser | null> => {
    try {
      return await firebaseService.signInWithGoogle();
    } catch (error) {
      console.error('[AuthModule] Google sign-in failed:', error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await firebaseService.signOut();
    } catch (error) {
      console.error('[AuthModule] Logout failed:', error);
    }
  },

  getCurrentUser: () => firebaseService.getCurrentUser(),
};
