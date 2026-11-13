import { describe, expect, test } from 'vitest';
import { corDoStatus, rotuloDoStatus, STATUS_ENTREGA_COR, STATUS_ENTREGA_LABEL } from './statusEntrega';
import type { StatusEntrega } from '@/pages/Entregas/types';

// Todos os status que o backend pode devolver. Se o enum crescer, esta lista
// precisa crescer junto — e é isso que mantém o teste honesto.
const TODOS: StatusEntrega[] = [
  'PENDENTE',
  'EM_TRANSITO',
  'ENTREGUE',
  'NAO_ENTREGUE',
  'CANCELADA',
];

describe('rótulos de status de entrega', () => {
  // O bug: o gráfico do Dashboard mostrava "NAO_ENTREGUE" cru porque o mapa
  // dele não tinha essa chave, e o fallback `?? status` exibia o enum sem
  // quebrar nada.
  test('NAO_ENTREGUE tem rótulo legível, não o enum', () => {
    expect(rotuloDoStatus('NAO_ENTREGUE')).toBe('Não entregue');
    expect(rotuloDoStatus('NAO_ENTREGUE')).not.toMatch(/_/);
  });

  test.each(TODOS)('%s tem rótulo e cor', (status) => {
    expect(STATUS_ENTREGA_LABEL[status]).toBeTruthy();
    expect(STATUS_ENTREGA_COR[status]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  // Nenhum rótulo pode parecer identificador de banco: sublinhado ou tudo em
  // maiúscula é sinal de enum escapando para a tela.
  test.each(TODOS)('o rótulo de %s não parece um enum', (status) => {
    const rotulo = STATUS_ENTREGA_LABEL[status];
    expect(rotulo).not.toContain('_');
    expect(rotulo).not.toBe(rotulo.toUpperCase());
  });

  test('status desconhecido cai no próprio texto, sem quebrar', () => {
    expect(rotuloDoStatus('STATUS_NOVO')).toBe('STATUS_NOVO');
    expect(corDoStatus('STATUS_NOVO')).toMatch(/^#/);
  });

  // Cores próximas demais numa pizza são indistinguíveis. NAO_ENTREGUE fica ao
  // lado de EM_TRANSITO no gráfico, então as duas não podem ser do mesmo tom.
  test('NAO_ENTREGUE e EM_TRANSITO têm cores distintas', () => {
    expect(STATUS_ENTREGA_COR.NAO_ENTREGUE).not.toBe(STATUS_ENTREGA_COR.EM_TRANSITO);
  });

  test('não há cor repetida entre status', () => {
    const cores = TODOS.map((s) => STATUS_ENTREGA_COR[s]);
    expect(new Set(cores).size).toBe(cores.length);
  });
});
