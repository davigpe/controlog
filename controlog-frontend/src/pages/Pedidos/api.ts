import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PaginatedResponse } from '@/lib/api';
import type { Pedido } from './types';

interface ListParams {
  disponivel?: boolean;
  page?: number;
  pageSize?: number;
}

export function usePedidos(params: ListParams = {}) {
  return useQuery({
    queryKey: ['pedidos', params],
    queryFn: async () => (await api.get<PaginatedResponse<Pedido>>('/pedidos', { params })).data,
  });
}

export function useGerarPedidos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (quantidade: number) =>
      (await api.post<Pedido[]>('/pedidos/gerar', { quantidade })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pedidos'] }),
  });
}

export function useCriarPlano() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { nome: string; pedidoIds: string[] }) =>
      (await api.post('/planos', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
      queryClient.invalidateQueries({ queryKey: ['planos'] });
    },
  });
}
