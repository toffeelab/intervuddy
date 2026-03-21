import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed:
    typeof window !== 'undefined' ? localStorage.getItem('iv-sidebar-collapsed') === 'true' : false,

  toggleCollapsed: () =>
    set((state) => {
      const next = !state.isCollapsed;
      localStorage.setItem('iv-sidebar-collapsed', String(next));
      return { isCollapsed: next };
    }),

  setCollapsed: (collapsed) => {
    localStorage.setItem('iv-sidebar-collapsed', String(collapsed));
    set({ isCollapsed: collapsed });
  },
}));
