import { proximoCodigoSequencial } from '../src/utils/codigoSequencial.js';

describe('proximoCodigoSequencial', () => {
  test('começa em 001 quando não há nenhum código existente', () => {
    expect(proximoCodigoSequencial([], 'RT-')).toBe('RT-001');
  });

  test('encontra o maior número e soma 1, independente da ordem', () => {
    expect(proximoCodigoSequencial(['RT-001', 'RT-003', 'RT-002'], 'RT-')).toBe('RT-004');
  });

  test('ignora códigos malformados ou de outro prefixo', () => {
    expect(proximoCodigoSequencial(['RT-001', 'EN-999', 'RT-abc', 'RT-'], 'RT-')).toBe('RT-002');
  });

  test('preserva o zero-padding até 3 dígitos e cresce além disso quando necessário', () => {
    expect(proximoCodigoSequencial(['RT-099'], 'RT-')).toBe('RT-100');
    expect(proximoCodigoSequencial(['RT-999'], 'RT-')).toBe('RT-1000');
  });
});
