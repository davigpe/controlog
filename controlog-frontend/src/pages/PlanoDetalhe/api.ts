import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { PlanoDetalhe } from './types';

interface AprovarRotaInput {
  rotaIndex: number;
  /** null aprova a rota sem motorista: a atribuição acontece depois. */
  motoristaId: string | null;
  /** null com veiculoProprio falso significa "a definir". */
  veiculoId: string | null;
  /** O motorista usa veículo que não é da frota. Excludente com veiculoId. */
  veiculoProprio: boolean;
  dataHora: string;
}

interface RotaAprovada {
  id: string;
  codigo: string;
}

interface MoverPedidosInput {
  pedidoIds: string[];
  /** null desatribui: o pedido continua no plano, mas fora de qualquer rota. */
  rotaIndex: number | null;
}

export function usePlano(id: string) {
  return useQuery({
    queryKey: ['planos', id],
    queryFn: async () => (await api.get<PlanoDetalhe>(`/planos/${id}`)).data,
    enabled: !!id,
  });
}

export function useOtimizarPlano(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tamanhoRota: number) =>
      (await api.post<PlanoDetalhe>(`/planos/${id}/otimizar`, { tamanhoRota })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planos'] }),
  });
}

export function useRenomearPlano(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => (await api.put<PlanoDetalhe>(`/planos/${id}`, { nome })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planos'] }),
  });
}

export function useMoverPedidos(planoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: MoverPedidosInput) =>
      (await api.patch<PlanoDetalhe>(`/planos/${planoId}/pedidos/rota`, dados)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['planos'] }),
  });
}

export function useAprovarRota(planoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rotaIndex,
      motoristaId,
      veiculoId,
      veiculoProprio,
      dataHora,
    }: AprovarRotaInput) =>
      (
        await api.post<RotaAprovada>(`/planos/${planoId}/rotas/${rotaIndex}/aprovar`, {
          motoristaId,
          veiculoId,
          veiculoProprio,
          dataHora,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      queryClient.invalidateQueries({ queryKey: ['rotas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
