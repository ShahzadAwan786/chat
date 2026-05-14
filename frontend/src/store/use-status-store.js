import { create } from "zustand";

const useStatusStore = create((set, get) => ({
  statuses: [], // all statuses from API
  myStatus: [], // current user's own statuses
  loading: false,
  error: null,

  setStatuses: (statuses) => set({ statuses }),

  setMyStatus: (myStatus) => set({ myStatus }),

  addStatus: (status) =>
    set((state) => ({
      statuses: [status, ...state.statuses],
      myStatus:
        status.user?._id === get()._currentUserId
          ? [status, ...state.myStatus]
          : state.myStatus,
    })),

  removeStatus: (statusId) =>
    set((state) => ({
      statuses: state.statuses.filter((s) => s._id !== statusId),
      myStatus: state.myStatus.filter((s) => s._id !== statusId),
    })),

  // When someone views a status — update viewer count in place
  updateStatusViewers: ({ statusId, viewers, totalViewers }) =>
    set((state) => ({
      statuses: state.statuses.map((s) =>
        s._id === statusId ? { ...s, viewers, totalViewers } : s,
      ),
      myStatus: state.myStatus.map((s) =>
        s._id === statusId ? { ...s, viewers, totalViewers } : s,
      ),
    })),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  clearStatuses: () => set({ statuses: [], myStatus: [] }),
}));

export default useStatusStore;
