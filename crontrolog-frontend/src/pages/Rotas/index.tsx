import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import type { Rota } from './types';
import RotasTable from './RotasTable';
import RotaModal from './RotaModal';
import RotaDetalhes from './RotaDetalhes';

const rotasMock: Rota[] = [
  {
    id: '1',
    codigo: 'RT-001',
    origem: 'Joinville, SC',
    destino: 'Florianópolis, SC',
    motorista: 'Carlos Silva',
    veiculo: 'Mercedes Sprinter - ABC-1234',
    status: 'ativa',
    dataHora: '2026-06-02T08:00:00',
    coordenadasOrigem: [-26.3045, -48.8487],
    coordenadasDestino: [-27.5954, -48.548],
  },
  {
    id: '2',
    codigo: 'RT-002',
    origem: 'Curitiba, PR',
    destino: 'São Paulo, SP',
    motorista: 'Ana Souza',
    veiculo: 'Volvo FH - DEF-5678',
    status: 'concluida',
    dataHora: '2026-06-01T14:00:00',
    coordenadasOrigem: [-25.4284, -49.2733],
    coordenadasDestino: [-23.5505, -46.6333],
  },
  {
    id: '3',
    codigo: 'RT-003',
    origem: 'Porto Alegre, RS',
    destino: 'Joinville, SC',
    motorista: 'Roberto Lima',
    veiculo: 'Scania R450 - GHI-9012',
    status: 'cancelada',
    dataHora: '2026-06-02T10:30:00',
    coordenadasOrigem: [-30.0346, -51.2177],
    coordenadasDestino: [-26.3045, -48.8487],
  },
  {
    id: '4',
    codigo: 'RT-004',
    origem: 'Blumenau, SC',
    destino: 'Curitiba, PR',
    motorista: 'Fernanda Costa',
    veiculo: 'Ford Cargo - JKL-3456',
    status: 'ativa',
    dataHora: '2026-06-02T09:15:00',
    coordenadasOrigem: [-26.9194, -49.0661],
    coordenadasDestino: [-25.4284, -49.2733],
  },
];

export default function RotasPage() {
  const [rotas, setRotas] = useState<Rota[]>(rotasMock);
  const [busca, setBusca] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [rotaEditando, setRotaEditando] = useState<Rota | null>(null);
  const [rotaDetalhes, setRotaDetalhes] = useState<Rota | null>(null);

  const rotasFiltradas = rotas.filter((r) =>
    [r.codigo, r.origem, r.destino, r.motorista, r.veiculo]
      .join(' ')
      .toLowerCase()
      .includes(busca.toLowerCase())
  );

  const handleSalvar = (data: Omit<Rota, 'id' | 'coordenadasOrigem' | 'coordenadasDestino'>) => {
    if (rotaEditando) {
      setRotas((prev) =>
        prev.map((r) => (r.id === rotaEditando.id ? { ...rotaEditando, ...data } : r))
      );
    } else {
      const nova: Rota = {
        ...data,
        id: String(Date.now()),
        coordenadasOrigem: [-26.3045, -48.8487],
        coordenadasDestino: [-27.5954, -48.548],
      };
      setRotas((prev) => [nova, ...prev]);
    }
    setRotaEditando(null);
  };

  const handleEditar = (rota: Rota) => {
    setRotaEditando(rota);
    setModalAberto(true);
  };

  const handleExcluir = (id: string) => {
    setRotas((prev) => prev.filter((r) => r.id !== id));
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
      <RotasTable
        rotas={rotasFiltradas}
        onVerDetalhes={setRotaDetalhes}
        onEditar={handleEditar}
        onExcluir={handleExcluir}
      />

      {/* Modal Criar/Editar */}
      <RotaModal
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleSalvar}
        rotaEditando={rotaEditando}
      />

      {/* Modal Detalhes + Mapa */}
      <RotaDetalhes
        rota={rotaDetalhes}
        open={!!rotaDetalhes}
        onClose={() => setRotaDetalhes(null)}
      />
    </div>
  );
}
