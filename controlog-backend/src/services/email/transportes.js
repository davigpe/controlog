import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2';

import { REGIAO_SES, REMETENTE, RESPONDER_PARA } from '../../config/email.js';

/**
 * Um transporte recebe `{ para, assunto, texto, html }` e entrega.
 *
 * Existem dois para o mesmo motivo de sempre: os testes e o desenvolvimento
 * local não podem depender de uma conta AWS nem mandar e-mail de verdade para
 * um endereço real. O service não sabe qual está em uso.
 */

/**
 * Escreve no log em vez de enviar. É o comportamento que o projeto já tinha
 * antes de existir provedor, preservado como transporte de desenvolvimento.
 */
export function criarTransporteDeRegistro({ logger = console } = {}) {
  return {
    nome: 'registro',
    async enviar({ para, assunto, texto }) {
      logger.log(`[email:registro] para=${para} assunto=${assunto}\n${texto}`);
      return { id: null, simulado: true };
    },
  };
}

/**
 * Envia pelo Amazon SES.
 *
 * Sem credencial explícita de propósito: na instância, o SDK pega as
 * credenciais do instance profile pelo metadata service. Nenhuma chave de API
 * entra no .env.production nem no repositório, que é o mesmo princípio do
 * OIDC usado no deploy.
 */
export function criarTransporteSes({ client, remetente = REMETENTE } = {}) {
  const ses = client ?? new SESv2Client({ region: REGIAO_SES });

  return {
    nome: 'ses',
    async enviar({ para, assunto, texto, html }) {
      const resposta = await ses.send(
        new SendEmailCommand({
          FromEmailAddress: remetente,
          Destination: { ToAddresses: [para] },
          ...(RESPONDER_PARA ? { ReplyToAddresses: [RESPONDER_PARA] } : {}),
          Content: {
            Simple: {
              Subject: { Data: assunto, Charset: 'UTF-8' },
              Body: {
                // Os dois formatos: o cliente escolhe o que sabe exibir, e a
                // versão em texto é o que aparece em pré-visualização e em
                // leitores de tela. Só HTML também costuma pesar mais no
                // filtro de spam.
                Text: { Data: texto, Charset: 'UTF-8' },
                Html: { Data: html, Charset: 'UTF-8' },
              },
            },
          },
        })
      );
      return { id: resposta.MessageId ?? null, simulado: false };
    },
  };
}
