/**
 * Configuração de envio de e-mail.
 *
 * O transporte é escolhido por variável de ambiente, e não por NODE_ENV: em
 * desenvolvimento costuma-se querer o registro em log, mas às vezes é preciso
 * exercitar o SES de verdade antes de subir — e amarrar a escolha ao ambiente
 * tiraria essa possibilidade.
 */

/** `ses` envia de verdade; `registro` escreve no log do servidor. */
export const TRANSPORTE = process.env.EMAIL_TRANSPORTE ?? 'registro';

/**
 * Remetente. Precisa ser um endereço (ou domínio) verificado no SES, senão a
 * chamada é recusada com MessageRejected.
 */
export const REMETENTE = process.env.EMAIL_REMETENTE ?? 'Controlog <nao-responda@localhost>';

/**
 * Para onde as respostas vão, se alguém responder ao e-mail automático. Vazio
 * omite o cabeçalho, e aí responder cai no remetente — que é uma caixa que
 * ninguém lê.
 */
export const RESPONDER_PARA = process.env.EMAIL_RESPONDER_PARA ?? '';

/** Região do SES. Separada da região do resto por poder diferir. */
export const REGIAO_SES = process.env.EMAIL_REGIAO ?? process.env.AWS_REGION ?? 'us-east-1';

/**
 * Nome que aparece nos textos das mensagens. Fica aqui, e não escrito nos
 * modelos, porque é a mesma string em vários lugares.
 */
export const NOME_DO_PRODUTO = 'Controlog';
