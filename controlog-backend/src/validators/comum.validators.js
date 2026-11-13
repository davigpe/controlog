import { z } from 'zod';

/**
 * Booleano vindo de query string.
 *
 * Existe porque `z.coerce.boolean()` não serve aqui: ele faz `Boolean(valor)`,
 * e numa query string todo valor chega como texto — `Boolean('false')` é
 * `true`. O filtro passava a pedir exatamente o oposto do que estava escrito.
 *
 * Foi o que zerou o card "Motoristas Ativos": a tela consulta
 * `?status=ATIVO&emRota=false`, o `false` virava `true`, e a resposta trazia
 * só quem estava em rota — nenhum motorista, enquanto havia sete ativos. O
 * card "Inativos", que não usa `emRota`, continuava certo, e foi essa
 * diferença que apontou a causa.
 *
 * Aceita booleano de verdade (corpo JSON) e as formas textuais usuais, e
 * recusa o resto. Recusar é deliberado: com `preprocess` devolvendo `false`
 * para o que não reconhece, um `?emRota=flase` digitado errado viraria um
 * filtro silencioso — a mesma classe de bug que este helper conserta. Melhor
 * um 422 dizendo o que chegou.
 */
export const booleanoDeQuery = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((valor) => valor === true || valor === 'true' || valor === '1');
