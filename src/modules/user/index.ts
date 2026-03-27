import type { User } from '../../core/types';

export interface UserProfile {
  avatar?: string;
  bio?: string;
}

export const userModule = {
  getUser: async (): Promise<User | null> => {
    // Імітація отримання профілю користувача
    return null;
  },

  updateProfile: async (profile: UserProfile): Promise<void> => {
    // Імітація оновлення профілю
  },
};
