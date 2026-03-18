import { create } from 'zustand';
import { CATEGORY_ALL } from '@/lib/constants';

interface StudyStore {
  activeCategory: string;
  searchQuery: string;
  expandedCards: Set<number>;
  allExpanded: boolean;
  selectedJdId: number | null;

  setActiveCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  toggleCard: (id: number) => void;
  toggleAll: (allIds: number[]) => void;
  setSelectedJdId: (jdId: number | null) => void;
}

export const useStudyStore = create<StudyStore>((set) => ({
  activeCategory: CATEGORY_ALL,
  searchQuery: '',
  expandedCards: new Set(),
  allExpanded: false,
  selectedJdId: null,

  setActiveCategory: (category) => set({ activeCategory: category }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleCard: (id) =>
    set((state) => {
      const next = new Set(state.expandedCards);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { expandedCards: next, allExpanded: false };
    }),

  toggleAll: (allIds) =>
    set((state) => {
      if (state.allExpanded) {
        return { expandedCards: new Set(), allExpanded: false };
      }
      return { expandedCards: new Set(allIds), allExpanded: true };
    }),

  setSelectedJdId: (jdId) => set({ selectedJdId: jdId }),
}));
