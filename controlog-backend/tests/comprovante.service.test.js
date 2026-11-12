import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { jest } from '@jest/globals';

import { MAXIMO_POR_ENTREGA } from '../src/config/comprovantes.js';
import { createComprovanteService } from '../src/services/comprovante.service.js';
import { createMinhasRotasService } from '../src/services/minhasRotas.service.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../src/utils/AppError.js';

function buildPrisma() {
  return {
    motorista: { findUnique: jest.fn() },
    entrega: { findUnique: jest.fn(), update: jest.fn() },
    comprovanteEntrega: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function arquivoFake(nome = 'foto.jpg') {
  return {
    filename: 'gerado-pelo-servidor.jpg',
    originalname: nome,
    mimetype: 'image/jpeg',
    size: 1024,
  };
}

describe('comprovante.service — registrar', () => {
  test('grava o comprovante quando a entrega é do motorista e está pendente', async () => {
    const prisma = buildPrisma();
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'PENDENTE', motoristaId: 'm1' });
    prisma.comprovanteEntrega.create.mockResolvedValue({
      id: 'c1', nomeOriginal: 'foto.jpg', mimeType: 'image/jpeg', tamanho: 1024, criadoEm: new Date(),
    });

    const service = createComprovanteService(prisma);
    const r = await service.registrar({ entregaId: 'e1', motoristaId: 'm1', arquivo: arquivoFake() });

    expect(r.id).toBe('c1');
    // O nome em disco e gerado pelo servidor; o do cliente so e guardado para
    // exibir. Se algum dia o `arquivo` passar a vir do originalname, este
    // teste quebra.
    expect(prisma.comprovanteEntrega.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          arquivo: 'gerado-pelo-servidor.jpg',
          nomeOriginal: 'foto.jpg',
        }),
      })
    );
  });

  test('recusa comprovante em entrega de outro motorista', async () => {
    const prisma = buildPrisma();
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'PENDENTE', motoristaId: 'OUTRO' });
    const service = createComprovanteService(prisma);

    await expect(
      service.registrar({ entregaId: 'e1', motoristaId: 'm1', arquivo: arquivoFake() })
    ).rejects.toThrow(ForbiddenError);
    expect(prisma.comprovanteEntrega.create).not.toHaveBeenCalled();
  });

  test('recusa comprovante em entrega já concluída', async () => {
    const prisma = buildPrisma();
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'ENTREGUE', motoristaId: 'm1' });
    const service = createComprovanteService(prisma);

    await expect(
      service.registrar({ entregaId: 'e1', motoristaId: 'm1', arquivo: arquivoFake() })
    ).rejects.toThrow(ConflictError);
  });

  test(`recusa o comprovante além do limite de ${MAXIMO_POR_ENTREGA}`, async () => {
    const prisma = buildPrisma();
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'PENDENTE', motoristaId: 'm1' });
    prisma.comprovanteEntrega.count.mockResolvedValue(MAXIMO_POR_ENTREGA);
    const service = createComprovanteService(prisma);

    await expect(
      service.registrar({ entregaId: 'e1', motoristaId: 'm1', arquivo: arquivoFake() })
    ).rejects.toThrow(ConflictError);
  });

  // O multer grava o arquivo antes de o service rodar. Sem a limpeza, cada
  // tentativa recusada deixaria um arquivo orfao no volume da instancia.
  test('apaga o arquivo do disco quando a validação recusa o envio', async () => {
    const { DIRETORIO_COMPROVANTES } = await import('../src/config/comprovantes.js');
    await fs.mkdir(DIRETORIO_COMPROVANTES, { recursive: true });
    const nome = `teste-${Date.now()}.jpg`;
    const caminho = path.join(DIRETORIO_COMPROVANTES, nome);
    await fs.writeFile(caminho, 'conteudo');

    const prisma = buildPrisma();
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'ENTREGUE', motoristaId: 'm1' });
    const service = createComprovanteService(prisma);

    await expect(
      service.registrar({
        entregaId: 'e1',
        motoristaId: 'm1',
        arquivo: { ...arquivoFake(), filename: nome },
      })
    ).rejects.toThrow(ConflictError);

    await expect(fs.access(caminho)).rejects.toThrow();
  });
});

describe('comprovante.service — remover', () => {
  test('recusa remoção depois que a entrega foi concluída', async () => {
    const prisma = buildPrisma();
    prisma.comprovanteEntrega.findUnique.mockResolvedValue({
      id: 'c1', arquivo: 'a.jpg', entrega: { id: 'e1', status: 'ENTREGUE', motoristaId: 'm1' },
    });
    const service = createComprovanteService(prisma);

    await expect(service.remover('c1', { motoristaId: 'm1' })).rejects.toThrow(ConflictError);
    expect(prisma.comprovanteEntrega.delete).not.toHaveBeenCalled();
  });

  test('recusa remoção de comprovante de outro motorista', async () => {
    const prisma = buildPrisma();
    prisma.comprovanteEntrega.findUnique.mockResolvedValue({
      id: 'c1', arquivo: 'a.jpg', entrega: { id: 'e1', status: 'PENDENTE', motoristaId: 'OUTRO' },
    });
    const service = createComprovanteService(prisma);

    await expect(service.remover('c1', { motoristaId: 'm1' })).rejects.toThrow(ForbiddenError);
  });

  test('a gestão remove sem passar motoristaId', async () => {
    const prisma = buildPrisma();
    prisma.comprovanteEntrega.findUnique.mockResolvedValue({
      id: 'c1', arquivo: 'a.jpg', entrega: { id: 'e1', status: 'PENDENTE', motoristaId: 'qualquer' },
    });
    const service = createComprovanteService(prisma);

    await service.remover('c1', { motoristaId: null });
    expect(prisma.comprovanteEntrega.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});

describe('comprovante.service — abrir', () => {
  test('recusa arquivo de entrega de outro motorista', async () => {
    const prisma = buildPrisma();
    prisma.comprovanteEntrega.findUnique.mockResolvedValue({
      id: 'c1', arquivo: 'a.jpg', mimeType: 'image/jpeg', nomeOriginal: 'a.jpg',
      entrega: { id: 'e1', status: 'PENDENTE', motoristaId: 'OUTRO' },
    });
    const service = createComprovanteService(prisma);

    await expect(service.abrir('c1', { motoristaId: 'm1' })).rejects.toThrow(ForbiddenError);
  });

  // Travessia de caminho: o `arquivo` e sempre gerado pelo servidor hoje, mas
  // a defesa fica na leitura para valer independentemente de quem escreveu a
  // linha no banco.
  test('recusa um nome de arquivo que escapa da pasta', async () => {
    const prisma = buildPrisma();
    prisma.comprovanteEntrega.findUnique.mockResolvedValue({
      id: 'c1', arquivo: '../../.env', mimeType: 'text/plain', nomeOriginal: 'x',
      entrega: { id: 'e1', status: 'PENDENTE', motoristaId: 'm1' },
    });
    const service = createComprovanteService(prisma);

    await expect(service.abrir('c1', { motoristaId: 'm1' })).rejects.toThrow(ValidationError);
  });

  test('404 quando a linha existe mas o arquivo sumiu do disco', async () => {
    const prisma = buildPrisma();
    prisma.comprovanteEntrega.findUnique.mockResolvedValue({
      id: 'c1', arquivo: 'nao-existe-mesmo.jpg', mimeType: 'image/jpeg', nomeOriginal: 'a.jpg',
      entrega: { id: 'e1', status: 'PENDENTE', motoristaId: 'm1' },
    });
    const service = createComprovanteService(prisma);

    await expect(service.abrir('c1', { motoristaId: 'm1' })).rejects.toThrow(NotFoundError);
  });
});

describe('concluir entrega exige comprovante', () => {
  function prismaComEntregaPendente(qtdComprovantes) {
    const prisma = buildPrisma();
    prisma.motorista.findUnique.mockResolvedValue({ id: 'm1', nome: 'Marcos' });
    prisma.entrega.findUnique.mockResolvedValue({ id: 'e1', status: 'PENDENTE', motoristaId: 'm1' });
    prisma.comprovanteEntrega.count.mockResolvedValue(qtdComprovantes);
    prisma.entrega.update.mockResolvedValue({
      id: 'e1', codigo: 'EN-001', destino: 'Rua X', status: 'ENTREGUE',
      dataPrevista: new Date(), dataEfetiva: new Date(), comprovantes: [],
    });
    return prisma;
  }

  // O motivo de a regra existir no service, e nao so no botao da tela: a tela
  // e conveniencia, e um PATCH direto na API contornaria o bloqueio visual.
  test('sem comprovante, recusa com ValidationError', async () => {
    const prisma = prismaComEntregaPendente(0);
    const service = createMinhasRotasService(prisma);

    await expect(service.concluirEntrega('u1', 'e1')).rejects.toThrow(ValidationError);
    expect(prisma.entrega.update).not.toHaveBeenCalled();
  });

  test('a mensagem diz o que fazer', async () => {
    const prisma = prismaComEntregaPendente(0);
    const service = createMinhasRotasService(prisma);

    await expect(service.concluirEntrega('u1', 'e1')).rejects.toThrow(/anexe ao menos um comprovante/i);
  });

  test('com um comprovante, conclui normalmente', async () => {
    const prisma = prismaComEntregaPendente(1);
    const service = createMinhasRotasService(prisma);

    const entrega = await service.concluirEntrega('u1', 'e1');
    expect(entrega.status).toBe('ENTREGUE');
    expect(prisma.entrega.update).toHaveBeenCalled();
  });
});
