import axios from 'axios';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: 'GESTOR' | 'OPERADOR' | 'MOTORISTA';
}

interface AuthState {
  usuario: Usuario | null;
  accessToken: string | null;
  refreshToken: string | null;
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<string | null>;
}

const baseURL = import.meta.env.VITE_API_URL;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      accessToken: null,
      refreshToken: null,

      async login(email, senha) {
        const { data } = await axios.post(`${baseURL}/auth/login`, { email, senha });
        set({ usuario: data.usuario, accessToken: data.accessToken, refreshToken: data.refreshToken });
      },

      async register(nome, email, senha) {
        const { data } = await axios.post(`${baseURL}/auth/register`, { nome, email, senha });
        set({ usuario: data.usuario, accessToken: data.accessToken, refreshToken: data.refreshToken });
      },

      logout() {
        set({ usuario: null, accessToken: null, refreshToken: null });
      },

      async refresh() {
        const refreshToken = get().refreshToken;
        if (!refreshToken) return null;
        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          set({ accessToken: data.accessToken });
          return data.accessToken as string;
        } catch {
          get().logout();
          return null;
        }
      },
    }),
    {
      name: 'controlog-auth',
      partialize: (state) => ({
        usuario: state.usuario,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
