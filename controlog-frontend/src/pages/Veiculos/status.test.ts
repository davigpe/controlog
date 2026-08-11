import { describe, expect, test } from 'vitest';
import { statusExibicao } from './status';
import type { Veiculo } from './types';

function buildVeiculo(overrides: Partial<Veiculo> = {}): Veiculo {
  return {
    id: 'v1',
    placa: 'ABC-1234',
    modelo: 'Mercedes Sprinter',
    capacidade: '1.500 kg',
    status: 'DISPONIVEL',
    emRota: false,
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

describe('statusExibicao (Veiculos)', () => {
  test('retorna "Manutenção" independentemente de emRota', () => {
    expect(statusExibicao(buildVeiculo({ status: 'MANUTENCAO', emRota: true }))).toBe('Manutenção');
  });

  test('retorna "Inativo" independentemente de emRota', () => {
    expect(statusExibicao(buildVeiculo({ status: 'INATIVO', emRota: true }))).toBe('Inativo');
  });

  test('retorna "Em Rota" quando disponível e com rota em andamento', () => {
    expect(statusExibicao(buildVeiculo({ status: 'DISPONIVEL', emRota: true }))).toBe('Em Rota');
  });

  test('retorna "Disponível" quando disponível e sem rota em andamento', () => {
    expect(statusExibicao(buildVeiculo({ status: 'DISPONIVEL', emRota: false }))).toBe('Disponível');
  });
});
