import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "../services/api";

interface AuthState {
  userId: string | null;
  isInitialized: boolean;
  register: () => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userId: null,
      isInitialized: false,

      initialize: async () => {
        const storedUserId = localStorage.getItem("cognitrack_user_id");
        if (storedUserId) {
          set({ userId: storedUserId, isInitialized: true });
        } else {
          set({ isInitialized: true });
        }
      },

      register: async () => {
        const response = await api.post<{ user_id: string; is_new: boolean }>("/auth/register", {});
        const { user_id } = response.data;
        localStorage.setItem("cognitrack_user_id", user_id);
        set({ userId: user_id });
      },

      logout: () => {
        localStorage.removeItem("cognitrack_user_id");
        set({ userId: null });
      },
    }),
    {
      name: "cognitrack-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ userId: state.userId }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true;
        }
      },
    }
  )
);