import { randomUUID } from 'node:crypto';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';
import { ValidationError } from '../utils/AppError.js';

function escolher(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

/**
 * Monta um pedido no endereço de um cliente cadastrado.
 *
 * Antes, cada pedido sorteava uma rua de uma lista, um número qualquer e um
 * ponto aleatório num raio em volta do centro do bairro. Duas consequências
 * ruins: o endereço escrito não correspondia ao ponto no mapa, e dois pedidos
 * nunca caíam no mesmo lugar — o que escondia o caso mais comum da operação,
 * que é o mesmo cliente comprando mais de um item.
 *
 * Agora a coordenada é a do cadastro, então pedidos do mesmo cliente coincidem
 * exatamente. O endereço e o nome são copiados para o pedido de propósito: são
 * um instantâneo, e o histórico precisa continuar correto se o cliente mudar
 * de endereço ou for renomeado depois.
 */
function pedidoParaCliente(cliente) {
  return {
    codigo: `PED-${randomUUID().slice(0, 8).toUpperCase()}`,
    clienteId: cliente.id,
    clienteNome: cliente.nome,
    endereco: cliente.endereco,
    cidade: cliente.bairro,
    lat: cliente.lat,
    lng: cliente.lng,
    unidades: Math.floor(Math.random() * 20) + 1,
    volumeM3: Math.round((Math.random() * 0.9 + 0.1) * 100) / 100,
  };
}

export function createPedidoService(prisma) {
  return {
    async gerar({ quantidade }) {
      const clientes = await prisma.cliente.findMany({ where: { ativo: true } });
      if (clientes.length === 0) {
        // Falha explícita em vez de gerar pedido sem destino: sem cadastro não
        // há endereço real, e inventar um reintroduziria o problema que o
        // cadastro resolve.
        throw new ValidationError(
          'Nenhum cliente ativo cadastrado. Cadastre clientes antes de gerar pedidos.'
        );
      }

      // Sorteio com reposição, de propósito: o mesmo cliente pode receber mais
      // de um pedido, que é como a operação real se comporta e é o caso que o
      // mapa agrupa.
      const dados = Array.from({ length: quantidade }, () => pedidoParaCliente(escolher(clientes)));
      await prisma.pedido.createMany({ data: dados });
      const codigos = dados.map((p) => p.codigo);
      return prisma.pedido.findMany({
        where: { codigo: { in: codigos } },
        orderBy: { criadoEm: 'asc' },
      });
    },

    async list({ disponivel, page = 1, pageSize = 10 } = {}) {
      const where = disponivel ? { planoId: null } : {};

      const [pedidos, total] = await Promise.all([
        prisma.pedido.findMany({
          where,
          orderBy: { criadoEm: 'desc' },
          ...paginationArgs({ page, pageSize }),
        }),
        prisma.pedido.count({ where }),
      ]);

      return { items: pedidos, pagination: paginationMeta({ page, pageSize, total }) };
    },
  };
}
