// Gera o próximo código sequencial de um prefixo (ex.: 'RT-001' -> 'RT-002'),
// olhando o maior número já usado entre os códigos existentes. Códigos que
// não seguem o formato `${prefixo}NNN` são ignorados.
export function proximoCodigoSequencial(codigosExistentes, prefixo) {
  const regex = new RegExp(`^${prefixo}(\\d+)$`);

  const maiorNumero = codigosExistentes.reduce((maior, codigo) => {
    const match = codigo.match(regex);
    if (!match) return maior;
    return Math.max(maior, parseInt(match[1], 10));
  }, 0);

  return `${prefixo}${String(maiorNumero + 1).padStart(3, '0')}`;
}
