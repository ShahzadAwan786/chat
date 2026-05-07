import { create } from "zustand";
import { persist } from "zustand/middleware";

const useLayoutStore = create(
  persist(
    (set) => ({
      activeTab: "chat",
      selectedContact: null,
      setSelectedContact: (contact) => set({ selectedContact: contact }),
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: "Layout-storage",
      getStorage: () => localStorage(),
    },
  ),
);

export default useLayoutStore;
