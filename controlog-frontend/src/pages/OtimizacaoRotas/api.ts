import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Coordenada, Pedido, ResultadoOtimizacao } from './types';

interface OtimizarPayload {
  origem: Coordenada;
  pedidos: Pedido[];
}

// Sem invalidação de cache aqui, ao contrário dos outros hooks de mutação do
// projeto: essa simulação não persiste nada no banco, então não há lista
// nenhuma pra invalidar.
export function useOtimizarRota() {
  return useMutation({
    mutationFn: async (payload: OtimizarPayload) =>
      (await api.post<ResultadoOtimizacao>('/otimizacao-rotas/otimizar', payload)).data,
  });
}
