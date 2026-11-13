import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { reduzirImagem } from '@/lib/reduzirImagem';
import type {
  Comprovante,
  EntregaDaRota,
  MinhasRotasResposta,
  MotivoInsucesso,
  StatusRota,
} from './types';

export function useMinhasRotas(status?: StatusRota) {
  return useQuery({
    queryKey: ['minhas-rotas', status ?? 'todas'],
    queryFn: async () =>
      (await api.get<MinhasRotasResposta>('/minhas-rotas', { params: { status } })).data,
  });
}

export function useConcluirEntrega() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entregaId: string) =>
      (await api.patch<EntregaDaRota>(`/minhas-rotas/entregas/${entregaId}/concluir`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['minhas-rotas'] }),
  });
}

export interface InsucessoInput {
  entregaId: string;
  motivo: MotivoInsucesso;
  observacao?: string;
}

export function useRegistrarInsucesso() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entregaId, ...corpo }: InsucessoInput) =>
      (await api.patch<EntregaDaRota>(`/minhas-rotas/entregas/${entregaId}/insucesso`, corpo)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['minhas-rotas'] }),
  });
}

// ─── Comprovantes de entrega ───────────────────────────────────────────────

export function useEnviarComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ entregaId, arquivo }: { entregaId: string; arquivo: File }) => {
      // Reduz antes de enviar: foto de celular costuma passar do limite do
      // servidor e demora demais numa conexão móvel. Ver lib/reduzirImagem.
      const enviar = await reduzirImagem(arquivo);
      const form = new FormData();
      form.append('arquivo', enviar);
      // Sem Content-Type explícito de propósito: o navegador precisa gerar o
      // boundary do multipart, e defini-lo à mão quebra o parse no servidor.
      return (
        await api.post<Comprovante>(`/minhas-rotas/entregas/${entregaId}/comprovantes`, form)
      ).data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['minhas-rotas'] }),
  });
}

export function useRemoverComprovante() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (comprovanteId: string) => {
      await api.delete(`/minhas-rotas/comprovantes/${comprovanteId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['minhas-rotas'] }),
  });
}

/**
 * Baixa o arquivo e devolve uma URL de objeto, para exibir ou abrir.
 *
 * Não dá para apontar um `<img src>` ou uma aba nova direto para a rota da
 * API: o token vai no cabeçalho Authorization, posto pelo interceptor do
 * axios, e nem a tag nem a aba enviam esse cabeçalho — a resposta seria 401.
 * Buscar como blob mantém a rota protegida sem precisar de token na URL, que
 * vazaria no histórico e no log do servidor.
 *
 * Quem chama é responsável por `URL.revokeObjectURL` quando não precisar mais.
 */
export async function baixarComprovante(comprovanteId: string): Promise<string> {
  const resposta = await api.get(`/minhas-rotas/comprovantes/${comprovanteId}/arquivo`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(resposta.data as Blob);
}
