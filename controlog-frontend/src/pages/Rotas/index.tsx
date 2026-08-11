import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/api';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import type { Rota, RotaInput } from './types';
import RotasTable from './RotasTable';
import RotaModal from './RotaModal';
import RotaDetalhes from './RotaDetalhes';
import { useCreateRota, useDeleteRota, useRotas, useUpdateRota } from './api';

export default function RotasPage() {
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [rotaEditando, setRotaEditando] = useState<Rota | null>(null);
  const [rotaDetalhes, setRotaDetalhes] = useState<Rota | null>(null);
  const [excluindo, setExcluindo] = useState<Rota | null>(null);

  const { data: rotas = [], isLoading } = useRotas({ busca: busca || undefined });
  const createMutation = useCreateRota();
  const updateMutation = useUpdateRota();
  const deleteMutation = useDeleteRota();

  const handleSalvar = (data: RotaInput) => {
    const mutation = rotaEditando
      ? updateMutation.mutateAsync({ id: rotaEditando.id, data })
      : createMutation.mutateAsync(data);

    mutation
      .then(() => {
        toast.success(rotaEditando ? 'Rota atualizada.' : 'Rota criada.');
        setModalAberto(false);
        setRotaEditando(null);
      })
      .catch((error) => toast.error(getErrorMessage(error)));
  };

  const handleEditar = (rota: Rota) => {
    setRotaEditando(rota);
    setModalAberto(true);
  };

  const handleExcluir = () => {
    if (!excluindo) return;
    deleteMutation
      .mutateAsync(excluindo.id)
      .then(() => {
        toast.success('Rota excluída.');
        setExcluindo(null);
      })
      .catch((error) => {
        toast.error(getErrorMessage(error, 'Não foi possível excluir esta rota.'));
        setExcluindo(null);
      });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rotas</h1>
          <p className="text-muted-foreground text-sm">Gerencie as rotas de entrega</p>
        </div>
        <Button
          onClick={() => {
            setRotaEditando(null);
            setModalAberto(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Rota
        </Button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por código, cidade, motorista..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          Carregando rotas...
        </div>
      ) : (
        <RotasTable
          rotas={rotas}
          onVerDetalhes={setRotaDetalhes}
          onEditar={handleEditar}
          onExcluir={setExcluindo}
        />
      )}

      {/* Modal Criar/Editar */}
      <RotaModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleSalvar}
        rotaEditando={rotaEditando}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      {/* Modal Detalhes + Mapa */}
      <RotaDetalhes
        rota={rotaDetalhes}
        open={!!rotaDetalhes}
        onClose={() => setRotaDetalhes(null)}
      />

      <ConfirmDialog
        open={!!excluindo}
        title="Excluir rota"
        description={`Tem certeza que deseja excluir a rota "${excluindo?.codigo}"? Rotas com entregas pendentes vinculadas não podem ser excluídas (RN08).`}
        loading={deleteMutation.isPending}
        onConfirm={handleExcluir}
        onCancel={() => setExcluindo(null)}
      />
    </div>
  );
}
