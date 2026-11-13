import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type PaginatedResponse } from '@/lib/api';
import type { Cliente, ClienteInput } from './types';

interface ListParams {
  busca?: string;
  ativo?: boolean;
  page?: number;
  pageSize?: number;
}

export function useClientes(params: ListParams = {}) {
  return useQuery({
    queryKey: ['clientes', params],
    queryFn: async () => (await api.get<PaginatedResponse<Cliente>>('/clientes', { params })).data,
  });
}

export function useCreateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClienteInput) => (await api.post<Cliente>('/clientes', data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  });
}

export function useUpdateCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClienteInput> }) =>
      (await api.put<Cliente>(`/clientes/${id}`, data)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  });
}

export function useDeleteCliente() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clientes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      // Os pedidos mostram o nome do cliente; se ele mudou, a lista precisa
      // ser relida.
      queryClient.invalidateQueries({ queryKey: ['pedidos'] });
    },
  });
}
