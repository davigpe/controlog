import { TRANSPORTE } from '../../config/email.js';
import { modeloRedefinicaoDeSenha } from './modelos.js';
import { criarTransporteDeRegistro, criarTransporteSes } from './transportes.js';

export function escolherTransporte(nome = TRANSPORTE) {
  if (nome === 'ses') return criarTransporteSes();
  if (nome === 'registro') return criarTransporteDeRegistro();
  // Falhar na subida, e não no primeiro e-mail: um nome errado em
  // EMAIL_TRANSPORTE descoberto só quando alguém esquece a senha significa um
  // usuário travado em vez de um deploy recusado.
  throw new Error(
    `EMAIL_TRANSPORTE inválido: "${nome}". Use "ses" ou "registro".`
  );
}

/**
 * Envio de e-mail da aplicação.
 *
 * O `transporte` é injetado para os testes não precisarem de AWS nem mandarem
 * mensagem de verdade.
 */
export function createEmailService({ transporte = escolherTransporte(), logger = console } = {}) {
  return {
    transporte: transporte.nome,

    /**
     * Devolve `{ enviado: boolean }` em vez de lançar.
     *
     * Quem chama é o fluxo de "esqueci minha senha", que não pode revelar se o
     * e-mail existe — e um erro propagado viraria resposta diferente para
     * endereço cadastrado e não cadastrado, abrindo justamente a enumeração de
     * usuários que o endpoint evita. A falha vai para o log do servidor, com o
     * destinatário, para dar o que investigar.
     */
    async enviarRedefinicaoDeSenha({ para, link, validadeMinutos }) {
      const { assunto, texto, html } = modeloRedefinicaoDeSenha({ link, validadeMinutos });
      try {
        const r = await transporte.enviar({ para, assunto, texto, html });
        return { enviado: true, simulado: r.simulado ?? false, id: r.id ?? null };
      } catch (erro) {
        logger.error(
          `[email] falha ao enviar redefinição de senha para ${para} via ${transporte.nome}:`,
          erro?.name ?? erro,
          erro?.message ?? ''
        );
        return { enviado: false, simulado: false, id: null };
      }
    },
  };
}
