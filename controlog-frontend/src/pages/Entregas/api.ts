import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PaginatedResponse } from '@/lib/api';
import type { Entrega, EntregaInput, StatusEntrega } from './types';

interface ListParams {
  busca?: string;
  status?: StatusEntrega;
  rotaId?: string;
  page?: number;
  pageSize?: number;
}

export function useEntregas(params: ListParams = {}) {
  return useQuery({
    queryKey: ['entregas', params],
    queryFn: async () => (await api.get<PaginatedResponse<Entrega>>('/entregas', { params })).data,
  });
}

export function useCreateEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: EntregaInput) => (await api.post<Entrega>('/entregas', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EntregaInput> }) =>
      (await api.put<Entrega>(`/entregas/${id}`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/entregas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entregas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
