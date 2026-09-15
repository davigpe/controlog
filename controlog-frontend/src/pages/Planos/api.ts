import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PaginatedResponse } from '@/lib/api';
import type { PlanoResumo } from './types';

interface ListParams {
  page?: number;
  pageSize?: number;
}

export function usePlanos(params: ListParams = {}) {
  return useQuery({
    queryKey: ['planos', params],
    queryFn: async () => (await api.get<PaginatedResponse<PlanoResumo>>('/planos', { params })).data,
  });
}

export function useDeletePlano() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/planos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}
