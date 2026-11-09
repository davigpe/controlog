/*
 * Base da API, resolvida num lugar só.
 *
 * Sem VITE_API_URL, a API é procurada em /api no mesmo host que serviu a
 * página. É assim que o deploy em contêiner funciona: o nginx da frente
 * entrega o site e encaminha /api para o backend, então não há origem cruzada
 * e o bundle não fica preso a um domínio escolhido no build.
 *
 * Em desenvolvimento a variável está no .env e aponta para localhost:3333,
 * onde a API roda em outra porta.
 *
 * Por que num módulo separado de lib/api.ts: o authStore também precisa da
 * base, e não pode importar lib/api.ts, porque lib/api.ts importa o authStore
 * para ler o token no interceptor — o ciclo quebraria. Antes disto o
 * authStore mantinha a própria cópia da expressão, e ela ficou para trás sem
 * o fallback: no build de produção (VITE_API_URL vazia) login, cadastro,
 * refresh e as duas rotas de senha iam para /auth/... em vez de /api/auth/...,
 * e o nginx respondia 405. Uma base, um lugar.
 */

/**
 * Separada de API_BASE_URL para poder ser testada com a variável vazia, que é
 * exatamente o caso do build de produção — e o único em que o bug aparecia.
 * Em teste, `import.meta.env.VITE_API_URL` vem preenchida pelo .env, então
 * medir só a constante não exercita nada.
 */
export function resolverBaseUrl(valor: string | undefined): string {
  const limpo = valor?.trim();
  return limpo ? limpo.replace(/\/+$/, '') : '/api';
}

export const API_BASE_URL = resolverBaseUrl(import.meta.env.VITE_API_URL);
