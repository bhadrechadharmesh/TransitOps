import { create } from "zustand";
import type { UserPayload, AppPage } from "@/lib/types";

interface AuthState {
  user: UserPayload | null;
  token: string | null;
  setAuth: (user: UserPayload, token: string) => void;
  logout: () => void;
  hydrated: boolean;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  hydrated: false,
  setAuth: (user, token) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("transitops_token", token);
      localStorage.setItem("transitops_user", JSON.stringify(user));
    }
    set({ user, token });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("transitops_token");
      localStorage.removeItem("transitops_user");
    }
    set({ user: null, token: null });
  },
  setHydrated: () => set({ hydrated: true }),
}));

interface AppState {
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: "dashboard",
  setCurrentPage: (page) => set({ currentPage: page }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));