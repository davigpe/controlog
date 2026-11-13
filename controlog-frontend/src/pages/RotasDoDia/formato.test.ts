import { describe, expect, test } from 'vitest';
import { dataPorExtenso, horaDaRota, horarioDaBase } from './formato';
import type { RotaDoDia } from './types';

const rota: RotaDoDia = {
  id: 'r1',
  codigo: 'RT-001',
  origem: 'Centro de Distribuição',
  destino: 'Joinville',
  status: 'ATIVA',
  dataHora: '2026-11-07T11:00:00.000Z',
  criadoEm: '2026-11-06T18:30:00.000Z',
  motorista: { id: 'm1', nome: 'Carlos Silva' },
  veiculo: { id: 'v1', placa: 'ABC-1234', modelo: 'Iveco Daily' },
  veiculoProprio: false,
  totalEntregas: 4,
  entregasConcluidas: 1,
};

describe('formato (Rotas do Dia)', () => {
  // O horário tem que sair no fuso de operação, e não no do navegador: é o
  // mesmo fuso em que o backend recorta o dia.
  test('formata o horário em UTC-3, independente do fuso do navegador', () => {
    expect(horaDaRota('2026-11-07T11:00:00.000Z')).toBe('08:00');
    expect(horaDaRota('2026-11-08T01:30:00.000Z')).toBe('22:30');
  });

  test('dataPorExtenso converte AAAA-MM-DD sem passar por fuso', () => {
    expect(dataPorExtenso('2026-11-07')).toBe('07/11/2026');
    // O caso que uma conversão via Date quebraria: 01/01 vira 31/12 quando o
    // AAAA-MM-DD é lido como UTC e exibido em UTC-3.
    expect(dataPorExtenso('2026-01-01')).toBe('01/01/2026');
  });

  test('horarioDaBase segue a visão escolhida', () => {
    expect(horarioDaBase(rota, 'dataHora')).toBe('08:00');
    expect(horarioDaBase(rota, 'criadoEm')).toBe('15:30');
  });
});
