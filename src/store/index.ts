import { create } from 'zustand';
import { createDataSlice } from './slices/dataSlice';
import { createSyncSlice } from './slices/syncSlice';
import { createUiSlice } from './slices/uiSlice';
import type { AppState, User } from '../core/types';

export const useStore = create<AppState & User>((...a) => ({
  ...createDataSlice(...a),
  ...createSyncSlice(...a),
  ...createUiSlice(...a),
}));

export default useStore;
