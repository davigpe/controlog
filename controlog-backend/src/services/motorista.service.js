import bcrypt from 'bcryptjs';
import { ConflictError, NotFoundError, ValidationError } from '../utils/AppError.js';
import { validarLinhaMotorista } from '../validators/motorista.validators.js';
import { paginationArgs, paginationMeta } from '../utils/pagination.js';

// Mesmo fator de custo usado no cadastro de qualquer outro usuário
// (src/services/auth.service.js).
const SALT_ROUNDS = 12;

const includeUsuario = { usuario: { select: { email: true } } };

function toResponse(motorista, extras = {}) {
  return {
    id: motorista.id,
    nome: motorista.nome,
    cnh: motorista.cnh,
    telefone: motorista.telefone,
    status: motorista.status,
    criadoEm: motorista.criadoEm,
    acessoEmail: motorista.usuario?.email ?? null,
    ...extras,
  };
}

export function createMotoristaService(prisma) {
  return {
    async list({ busca, status, emRota, page = 1, pageSize = 10 } = {}) {
      const where = {
        status: status ?? undefined,
        ...(emRota === true ? { rotas: { some: { status: 'ATIVA' } } } : {}),
        ...(emRota === false ? { rotas: { none: { status: 'ATIVA' } } } : {}),
        ...(busca
          ? {
              OR: [
                { nome: { contains: busca, mode: 'insensitive' } },
                { cnh: { contains: busca, mode: 'insensitive' } },
                { telefone: { contains: busca, mode: 'insensitive' } },
              ],
            }
          : {}),
      };

      const [motoristas, total] = await Promise.all([
        prisma.motorista.findMany({
          where,
          include: includeUsuario,
          orderBy: { nome: 'asc' },
          ...paginationArgs({ page, pageSize }),
        }),
        prisma.motorista.count({ where }),
      ]);

      const items = await Promise.all(
        motoristas.map(async (motorista) => {
          const [rotasAtivas, entregasRealizadas] = await Promise.all([
            prisma.rota.count({ where: { motoristaId: motorista.id, status: 'ATIVA' } }),
            prisma.entrega.count({ where: { motoristaId: motorista.id, status: 'ENTREGUE' } }),
          ]);
          return toResponse(motorista, { emRota: rotasAtivas > 0, entregasRealizadas });
        })
      );

      return { items, pagination: paginationMeta({ page, pageSize, total }) };
    },

    async getById(id) {
      const motorista = await prisma.motorista.findUnique({ where: { id }, include: includeUsuario });
      if (!motorista) throw new NotFoundError('Motorista não encontrado.');

      const [rotasAtivas, entregasRealizadas] = await Promise.all([
        prisma.rota.count({ where: { motoristaId: id, status: 'ATIVA' } }),
        prisma.entrega.count({ where: { motoristaId: id, status: 'ENTREGUE' } }),
      ]);

      return toResponse(motorista, { emRota: rotasAtivas > 0, entregasRealizadas });
    },

    async create(data) {
      const motorista = await prisma.motorista.create({ data });
      return toResponse(motorista, { emRota: false, entregasRealizadas: 0 });
    },

    async update(id, data) {
      const existente = await prisma.motorista.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Motorista não encontrado.');

      const motorista = await prisma.motorista.update({ where: { id }, data });
      return this.getById(motorista.id);
    },

    // Cria o login de um motorista já cadastrado. Fica aqui (e não no
    // auth.service) porque é uma ação administrativa sobre o motorista, não um
    // autocadastro: quem chama é um gestor, e o perfil MOTORISTA nunca é
    // atribuível pelo /auth/register público.
    async criarAcesso(id, { email, senha }) {
      const motorista = await prisma.motorista.findUnique({ where: { id } });
      if (!motorista) throw new NotFoundError('Motorista não encontrado.');
      if (motorista.usuarioId) {
        throw new ConflictError('Este motorista já possui acesso ao sistema.');
      }

      const emailEmUso = await prisma.usuario.findUnique({ where: { email } });
      if (emailEmUso) {
        throw new ConflictError('Já existe um usuário cadastrado com este e-mail.');
      }

      const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

      await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: { nome: motorista.nome, email, senhaHash, perfil: 'MOTORISTA' },
        });
        await tx.motorista.update({ where: { id }, data: { usuarioId: usuario.id } });
      });

      return this.getById(id);
    },

    // Importação em lote a partir de uma planilha. A conversão do arquivo em
    // linhas acontece no navegador (ver Motoristas/planilha.ts) — aqui chega
    // JSON, e a API continua sem precisar de upload multipart.
    //
    // É tudo ou nada: se uma linha falha, nada é gravado e a resposta devolve
    // a lista completa de problemas, cada um com o índice da linha. O usuário
    // corrige a planilha inteira de uma vez e reenvia; uma importação parcial
    // o deixaria sem saber o que entrou e o que não entrou.
    async importar(linhas) {
      const erros = [];
      const validos = [];
      // CNH -> índice onde ela apareceu primeiro, para apontar o par duplicado.
      const vistas = new Map();

      linhas.forEach((linha, indice) => {
        const resultado = validarLinhaMotorista(linha);
        if (!resultado.ok) {
          erros.push({ indice, mensagem: resultado.mensagem });
          return;
        }

        const { motorista } = resultado;
        const anterior = vistas.get(motorista.cnh);
        if (anterior !== undefined) {
          erros.push({
            indice,
            cnh: motorista.cnh,
            mensagem: `CNH repetida na própria planilha (já aparece na linha ${anterior + 1}).`,
          });
          return;
        }

        vistas.set(motorista.cnh, indice);
        validos.push({ motorista, indice });
      });

      // Uma consulta só para todas as CNHs da planilha — uma por linha
      // custaria 500 idas ao banco num lote cheio.
      if (vistas.size > 0) {
        const jaCadastradas = await prisma.motorista.findMany({
          where: { cnh: { in: [...vistas.keys()] } },
          select: { cnh: true, nome: true },
        });
        for (const existente of jaCadastradas) {
          erros.push({
            indice: vistas.get(existente.cnh),
            cnh: existente.cnh,
            mensagem: `CNH já cadastrada no sistema (${existente.nome}).`,
          });
        }
      }

      if (erros.length > 0) {
        erros.sort((a, b) => a.indice - b.indice);
        throw new ValidationError(
          `A planilha tem ${erros.length} ${erros.length === 1 ? 'linha com problema' : 'linhas com problema'}. Nada foi importado.`,
          { erros }
        );
      }

      const criados = await prisma.motorista.createMany({
        data: validos.map(({ motorista }) => motorista),
      });

      return { importados: criados.count };
    },

    // RN03 — Não é possível excluir um motorista que possui rotas ativas vinculadas
    async remove(id) {
      const existente = await prisma.motorista.findUnique({ where: { id } });
      if (!existente) throw new NotFoundError('Motorista não encontrado.');

      const rotasAtivas = await prisma.rota.count({ where: { motoristaId: id, status: 'ATIVA' } });
      if (rotasAtivas > 0) {
        throw new ConflictError(
          'Não é possível excluir um motorista com rotas ativas vinculadas (RN03).'
        );
      }

      await prisma.motorista.delete({ where: { id } });
    },
  };
}
