import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import Pagination from '@/components/shared/Pagination';
import { getErrorMessage } from '@/lib/api';
import { useDeletePlano, usePlanos } from './api';
import type { PlanoResumo, StatusPlano } from './types';

const statusStyle: Record<StatusPlano, string> = {
  ABERTO: 'bg-gray-100 text-gray-700',
  OTIMIZADO: 'bg-green-100 text-green-700',
};

const statusLabel: Record<StatusPlano, string> = {
  ABERTO: 'Aberto',
  OTIMIZADO: 'Otimizado',
};

export default function Planos() {
  const [page, setPage] = useState(1);
  const [excluindo, setExcluindo] = useState<PlanoResumo | null>(null);
  const navigate = useNavigate();

  const { data, isLoading } = usePlanos({ page });
  const deleteMutation = useDeletePlano();
  const planos = data?.items ?? [];

  function handleExcluir() {
    if (!excluindo) return;
    deleteMutation
      .mutateAsync(excluindo.id)
      .then(() => {
        toast.success('Plano excluído. Os pedidos dele voltaram a ficar disponíveis.');
        setExcluindo(null);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error, 'Não foi possível excluir este plano.'));
        setExcluindo(null);
      });
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Planos</h1>
          <p className="text-sm text-gray-600">{data?.pagination.total ?? 0} planos encontrados</p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Carregando planos...
        </div>
      ) : planos.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm px-6 py-12 text-center text-gray-600 text-sm">
          Nenhum plano criado ainda. Selecione pedidos na tela de Pedidos pra criar o primeiro.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planos.map((plano) => (
            <div
              key={plano.id}
              className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-800 truncate">{plano.nome}</p>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${statusStyle[plano.status]}`}
                >
                  {statusLabel[plano.status]}
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-1">
                <p>{plano.totalPedidos} pedido(s)</p>
                <p>Criado em {format(new Date(plano.criadoEm), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  onClick={() => navigate(`/planos/${plano.id}`)}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
                >
                  <Eye size={14} />
                  Visualizar Plano
                </button>
                <button
                  onClick={() => setExcluindo(plano)}
                  aria-label={`Excluir ${plano.nome}`}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data && <Pagination pagination={data.pagination} onPageChange={setPage} />}

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir plano"
        description={`Tem certeza que deseja excluir o plano "${excluindo?.nome}"? Os pedidos vinculados a ele voltam a ficar disponíveis.`}
        loading={deleteMutation.isPending}
        onConfirm={handleExcluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
