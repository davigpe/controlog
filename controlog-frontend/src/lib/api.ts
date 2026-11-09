import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';

/*
 * Sem VITE_API_URL, a API é procurada em /api no mesmo host que serviu a
 * página. É assim que o deploy em contêiner funciona: o nginx da frente
 * entrega o site e encaminha /api para o backend, então não há origem
 * cruzada e o bundle não fica preso a um domínio escolhido no build — que
 * era a maior amarra do deploy anterior, onde trocar a URL da API exigia
 * reconstruir o frontend inteiro.
 *
 * Em desenvolvimento a variável está no .env e aponta para localhost:3333,
 * onde a API roda em outra porta.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry && useAuthStore.getState().refreshToken) {
      original._retry = true;

      refreshPromise ??= useAuthStore.getState().refresh();
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }

      useAuthStore.getState().logout();
    }

    return Promise.reject(error);
  }
);

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export function getErrorMessage(error: unknown, fallback = 'Ocorreu um erro inesperado.'): string {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { message?: string } | undefined)?.message ?? fallback;
  }
  return fallback;
}
