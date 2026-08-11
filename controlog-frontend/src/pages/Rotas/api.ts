import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Rota, RotaInput, StatusRota } from './types';

interface ListParams {
  busca?: string;
  status?: StatusRota;
}

export function useRotas(params: ListParams = {}) {
  return useQuery({
    queryKey: ['rotas', params],
    queryFn: async () => (await api.get<Rota[]>('/rotas', { params })).data,
  });
}

export function useCreateRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: RotaInput) => (await api.post<Rota>('/rotas', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RotaInput> }) =>
      (await api.put<Rota>(`/rotas/${id}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteRota() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/rotas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rotas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
