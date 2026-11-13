/**
 * Como motorista e veículo de uma rota aparecem na tela.
 *
 * Fica num módulo só porque o veículo tem três estados, não dois, e a diferença
 * importa para quem opera: um veículo da frota, um veículo próprio do motorista
 * (a rota saiu, mas não consumiu a frota) e nenhum ainda (a rota foi aprovada e
 * a definição ficou para depois). Espalhar esse `if` pelas telas garantiria que
 * uma delas acabasse mostrando "—" para os dois últimos casos, que é
 * justamente a confusão que a marcação existe para evitar.
 */

export const SEM_DEFINICAO = 'A definir';
export const VEICULO_PROPRIO = 'Veículo próprio';

export function nomeDoMotorista(motorista: { nome: string } | null | undefined): string {
  return motorista?.nome ?? SEM_DEFINICAO;
}

export function descricaoDoVeiculo(rota: {
  veiculo: { placa: string; modelo: string } | null;
  veiculoProprio: boolean;
}): string {
  if (rota.veiculo) return `${rota.veiculo.placa} — ${rota.veiculo.modelo}`;
  return rota.veiculoProprio ? VEICULO_PROPRIO : SEM_DEFINICAO;
}

/** Placa, ou o rótulo do estado — para colunas estreitas de tabela. */
export function placaDoVeiculo(rota: {
  veiculo: { placa: string } | null;
  veiculoProprio: boolean;
}): string {
  if (rota.veiculo) return rota.veiculo.placa;
  return rota.veiculoProprio ? VEICULO_PROPRIO : SEM_DEFINICAO;
}

/** Verdadeiro quando ainda falta alguém definir isto. */
export function pendenteDeDefinicao(rota: {
  motorista: unknown | null;
  veiculo: unknown | null;
  veiculoProprio: boolean;
}): boolean {
  return !rota.motorista || (!rota.veiculo && !rota.veiculoProprio);
}

/**
 * Tradução entre o `<select>` de veículo e o que a API espera.
 *
 * O campo tem três respostas possíveis e a API as representa em dois campos
 * (`veiculoId` e `veiculoProprio`), então a conversão mora aqui: as telas de
 * aprovar, editar e atribuir rota precisam dela, e uma divergência entre elas
 * geraria rota marcada como própria com veículo junto — que o banco recusa.
 */
// Sentinelas, e não string vazia: o SelectItem do Radix reserva '' para
// limpar a seleção e recusa um item com esse valor.
export const VALOR_A_DEFINIR = 'A_DEFINIR';
export const VALOR_VEICULO_PROPRIO = 'PROPRIO';

export function veiculoParaPayload(valor: string): {
  veiculoId: string | null;
  veiculoProprio: boolean;
} {
  if (valor === VALOR_VEICULO_PROPRIO) return { veiculoId: null, veiculoProprio: true };
  if (!valor || valor === VALOR_A_DEFINIR) return { veiculoId: null, veiculoProprio: false };
  return { veiculoId: valor, veiculoProprio: false };
}

/** O id escolhido, ou null quando a pessoa escolheu deixar para depois. */
export function motoristaParaPayload(valor: string): string | null {
  return !valor || valor === VALOR_A_DEFINIR ? null : valor;
}

export function veiculoParaFormulario(rota: {
  veiculo: { id: string } | null;
  veiculoProprio: boolean;
}): string {
  if (rota.veiculo) return rota.veiculo.id;
  return rota.veiculoProprio ? VALOR_VEICULO_PROPRIO : VALOR_A_DEFINIR;
}
