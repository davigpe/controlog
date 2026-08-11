import { describe, expect, test } from 'vitest';
import { statusExibicao } from './status';
import type { Motorista } from './types';

function buildMotorista(overrides: Partial<Motorista> = {}): Motorista {
  return {
    id: 'm1',
    nome: 'Carlos Silva',
    cnh: '12345678901',
    telefone: '(47) 99111-1111',
    status: 'ATIVO',
    emRota: false,
    entregasRealizadas: 0,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

describe('statusExibicao (Motoristas)', () => {
  test('retorna "Inativo" quando o status é INATIVO, mesmo com rota ativa', () => {
    expect(statusExibicao(buildMotorista({ status: 'INATIVO', emRota: true }))).toBe('Inativo');
  });

  test('retorna "Em Rota" quando ativo e com rota em andamento', () => {
    expect(statusExibicao(buildMotorista({ status: 'ATIVO', emRota: true }))).toBe('Em Rota');
  });

  test('retorna "Ativo" quando ativo e sem rota em andamento', () => {
    expect(statusExibicao(buildMotorista({ status: 'ATIVO', emRota: false }))).toBe('Ativo');
  });
});
