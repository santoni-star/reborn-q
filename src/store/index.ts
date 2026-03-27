import { create } from 'zustand';
import { createDataSlice, DataSlice } from './slices/dataSlice';
import { createSyncSlice, SyncSlice } from './slices/syncSlice';
import { createUiSlice, UiSlice } from './slices/uiSlice';

export type RootStore = DataSlice & UiSlice & SyncSlice;

export const useStore = create<RootStore>()((...a) => ({
  ...createDataSlice(...a),
  ...createUiSlice(...a),
  ...createSyncSlice(...a),
}));

export default useStore;
export type { MobileTab } from './slices/uiSlice';
