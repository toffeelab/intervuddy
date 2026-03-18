import { create } from 'zustand';

interface EditStore {
  editingItemId: string | null; // "question-5", "followup-3" 등
  drawerOpen: boolean;
  drawerTargetId: number | null;

  startEditing: (itemId: string) => void;
  stopEditing: () => void;
  openDrawer: (targetId: number) => void;
  closeDrawer: () => void;
}

export const useEditStore = create<EditStore>((set) => ({
  editingItemId: null,
  drawerOpen: false,
  drawerTargetId: null,

  startEditing: (itemId) => set({ editingItemId: itemId }),
  stopEditing: () => set({ editingItemId: null }),
  openDrawer: (targetId) => set({ drawerOpen: true, drawerTargetId: targetId }),
  closeDrawer: () => set({ drawerOpen: false, drawerTargetId: null }),
}));
