import { create } from 'zustand';
import { createDataSlice, DataSlice } from './slices/dataSlice';
import { createUiSlice, UiSlice } from './slices/uiSlice';
import { createSyncSlice, SyncSlice } from './slices/syncSlice';

export type RootStore = DataSlice & UiSlice & SyncSlice;

export const useStore = create<RootStore>()((...a) => ({
  ...createDataSlice(...a),
  ...createUiSlice(...a),
  ...createSyncSlice(...a),
}));

export type { MobileTab } from './slices/uiSlice';
