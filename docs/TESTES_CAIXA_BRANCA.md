# Testes de caixa branca — Controlog

Testes de caixa branca (*white-box*) são planejados a partir do código: em vez
de perguntar só "a funcionalidade responde certo?", perguntam "cada comando,
cada decisão e cada caminho deste código foi exercitado por algum teste?".
Este documento registra os critérios usados no projeto, a cobertura medida e a
aplicação do **teste de caminho básico** a três funções de regra de negócio.

O complemento de caixa preta (casos por requisito e por regra de negócio,
integração HTTP e roteiro exploratório) está no
[PLANO_DE_TESTES.md](PLANO_DE_TESTES.md).

## 1. Onde cada teste do projeto se encaixa

| Tipo | Testes | Por que é desse tipo |
|---|---|---|
| **Caixa branca** | Unitários dos *services* do backend, com Prisma Client mockado | O teste controla o retorno de cada consulta ao banco e, com isso, escolhe por qual desvio do código a execução passa |
| **Caixa branca** | Unitários dos *middlewares* (`requireAuth`, `requireRole`, `validate`, `errorHandler`) | Cada teste força um ramo específico: sem token, token inválido, perfil errado |
| **Caixa branca** | Cobertura de comandos e de decisões (Jest, Vitest e SonarCloud) | É o critério que mede, linha a linha e desvio a desvio, o que os testes alcançaram |
| Caixa preta | Integração HTTP com Supertest | Olha só requisição e resposta, sem ver a implementação |
| Caixa preta | Casos por requisito (RF) e por regra de negócio (RN) | Derivados da especificação, não do código |
| Caixa preta | Componentes e páginas do frontend com Testing Library, roteiro Playwright | Interagem pela interface, como o usuário |

## 2. Critérios de cobertura

| Critério | O que exige | Como é medido |
|---|---|---|
| Cobertura de comandos (*statements*) | Todo comando executado ao menos uma vez | `npm run test:coverage`, coluna `% Stmts` |
| Cobertura de decisões (*branches*) | Cada decisão tomada para os dois lados, verdadeiro e falso | Coluna `% Branch`; no `lcov.info`, as linhas `BRDA` |
| Cobertura de caminho básico | Um teste para cada caminho independente do grafo de fluxo, em número igual à complexidade ciclomática V(G) | Análise manual, seção 4 |
| Cobertura de condições (MC/DC) | Em decisão composta, cada condição simples mostrada mudando o resultado sozinha | Análise manual, seção 4.3 |

A meta do RNF07 é 70% de cobertura. Ela está configurada como limite mínimo em
[`jest.config.js`](../controlog-backend/jest.config.js) e
[`vite.config.ts`](../controlog-frontend/vite.config.ts) e reprova o CI se cair.

### Por que cobertura de linhas não basta

A exclusão de rota (seção 4.1) tinha a linha `if (!existente) throw ...`
marcada como executada duas vezes. Pela cobertura de linhas, estava testada. O
`lcov.info` mostrava outra coisa:

```
BRDA:164,29,0,0   ← desvio "rota não existe": seguido 0 vezes
BRDA:164,29,1,2   ← desvio "rota existe": seguido 2 vezes
```

A linha era executada, mas a condição nunca tinha dado verdadeiro. É o tipo de
lacuna que só a análise de decisões e de caminhos mostra.

## 3. Cobertura medida

Medição de 18/11/2026, com `npm run test:coverage`. O painel do
[SonarCloud](https://sonarcloud.io/project/overview?id=davigpe_controlog)
mostra o valor atual a cada análise do CI.

**Backend** (308 testes em 28 suítes):

| Módulo | Comandos | Decisões | Funções |
|---|---|---|---|
| `services` (regras de negócio) | 91,0% | **80,9%** (335/414) | 93,7% |
| `middlewares` | 82,6% | 71,0% (22/31) | 72,7% |
| `utils` | 100,0% | 75,0% (18/24) | 100,0% |
| `validators` | 88,5% | 44,4% (8/18) | 36,4% |
| `controllers` | 67,2% | 0,0% (0/2) | 72,1% |
| `routes` | 95,7% | 25,0% (1/4) | 33,3% |
| **Total** | **88,9%** | **77,2%** (387/501) | **84,2%** |

**Frontend** (324 testes em 42 suítes): 81,1% de comandos, 76,9% de decisões,
77,6% de funções.

A análise de caminho básico se concentra em `services`, onde estão as regras
de negócio. Os números baixos de `validators`, `controllers` e `routes` vêm de
poucas decisões: são *schemas* do Zod e funções que só repassam a chamada.
Esses arquivos são exercitados como caixa preta pelos testes de integração
HTTP, que olham a resposta e não os desvios internos.

## 4. Teste de caminho básico

Roteiro aplicado a cada função:

1. Montar o **grafo de fluxo de controle**: cada comando ou decisão vira um nó.
2. Calcular a **complexidade ciclomática**: V(G) = número de decisões simples + 1.
3. Listar os **caminhos independentes**, V(G) no total.
4. Para cada caminho, definir entrada e saída esperada e apontar o teste que o
   cobre.
5. Quando faltar teste, escrever, e confirmar que ele falha se o código for
   quebrado de propósito (seção 5).

### 4.1 `rota.remove`: exclusão de rota (RN08)

Código: [`rota.service.js:162-176`](../controlog-backend/src/services/rota.service.js#L162-L176)

```js
async remove(id) {
  const existente = await prisma.rota.findUnique({ where: { id } });   // 1
  if (!existente) throw new NotFoundError('Rota não encontrada.');      // 2 → 3
  const entregasPendentes = await prisma.entrega.count({ ... });        // 4
  if (entregasPendentes > 0) throw new ConflictError('... (RN08).');    // 5 → 6
  await prisma.rota.delete({ where: { id } });                          // 7
}
```

Grafo de fluxo:

```
  (1) busca a rota
   │
  (2) existe? ──não──► (3) NotFoundError ──────────┐
   │ sim                                           │
  (4) conta entregas PENDENTE / EM_TRANSITO        │
   │                                               │
  (5) pendentes > 0? ──sim──► (6) ConflictError ───┤
   │ não                                           │
  (7) exclui ──────────────────────────────────────┴──► fim
```

**V(G) = 2 decisões + 1 = 3**

| Caminho | Nós | Entrada | Saída esperada | Teste |
|---|---|---|---|---|
| C1 | 1-2-3 | rota não existe | `NotFoundError`, sem contar entregas nem excluir | [`remove C1`](../controlog-backend/tests/rota.service.test.js#L309) — **novo** |
| C2 | 1-2-4-5-6 | rota com entrega pendente | `ConflictError`, sem excluir | [`remove bloqueia exclusão...`](../controlog-backend/tests/rota.service.test.js#L185) |
| C3 | 1-2-4-5-7 | rota sem pendências | exclui | [`remove permite exclusão...`](../controlog-backend/tests/rota.service.test.js#L196) |

O caminho C1 não tinha teste (seção 2). Agora os 3 caminhos estão cobertos.

### 4.2 `motorista.remove`: exclusão de motorista (RN03)

Código: [`motorista.service.js:187-199`](../controlog-backend/src/services/motorista.service.js#L187-L199)

A estrutura é a mesma da exclusão de rota, trocando "entregas pendentes" por
"rotas ativas do motorista".

```
  (1) busca o motorista
   │
  (2) existe? ──não──► (3) NotFoundError ──────────┐
   │ sim                                           │
  (4) conta rotas ATIVA do motorista               │
   │                                               │
  (5) ativas > 0? ──sim──► (6) ConflictError ──────┤
   │ não                                           │
  (7) exclui ──────────────────────────────────────┴──► fim
```

**V(G) = 2 decisões + 1 = 3**

| Caminho | Nós | Entrada | Saída esperada | Teste |
|---|---|---|---|---|
| C1 | 1-2-3 | motorista não existe | `NotFoundError` | [`remove lança NotFoundError...`](../controlog-backend/tests/motorista.service.test.js#L76) |
| C2 | 1-2-4-5-6 | motorista com rota ativa | `ConflictError`, sem excluir | [`remove bloqueia exclusão...`](../controlog-backend/tests/motorista.service.test.js#L53) |
| C3 | 1-2-4-5-7 | motorista sem rota ativa | exclui | [`remove permite exclusão...`](../controlog-backend/tests/motorista.service.test.js#L64) |

Esta função já estava completa: os 3 caminhos tinham teste. No `lcov.info`, as
duas decisões (linhas 189 e 192) aparecem seguidas para os dois lados.

### 4.3 `rota.update`: edição de rota (RN05 e RN02)

Código: [`rota.service.js:93-159`](../controlog-backend/src/services/rota.service.js#L93-L159)

A função inteira tem 18 condições simples: existência da rota, código,
reativação, motorista, veículo, veículo próprio e troca de motorista. Logo,
**V(G) = 18 + 1 = 19**. Uma tabela de 19 caminhos para a função toda seria
ilegível, então a análise se concentra no trecho das duas regras de negócio
(linhas 97 a 111). Os demais desvios já eram cobertos pelos testes existentes.

#### Trecho RN05: o código da rota é único

```js
if (data.codigo && data.codigo !== existente.codigo) {          // D1 = P1 && P2
  const codigoEmUso = await prisma.rota.findUnique({ ... });
  if (codigoEmUso) throw new ConflictError('... (RN05).');       // D2
}
```

Três condições simples (P1, P2 e D2), logo **V(G) do trecho = 3 + 1 = 4**.

| Caminho | P1: código informado | P2: diferente do atual | D2: em uso | Saída esperada | Teste |
|---|---|---|---|---|---|
| RN05-A | F | — | — | segue, sem consultar | qualquer *update* sem `codigo`, por exemplo [`update rejeita motoristaId...`](../controlog-backend/tests/rota.service.test.js#L251) |
| RN05-B | V | F | — | segue, **sem consultar** | [`update RN05-B`](../controlog-backend/tests/rota.service.test.js#L324) — **novo** |
| RN05-C | V | V | F | segue, com o código novo | [`update RN05-C`](../controlog-backend/tests/rota.service.test.js#L335) — **novo** |
| RN05-D | V | V | V | `ConflictError` | [`update rejeita novo código...`](../controlog-backend/tests/rota.service.test.js#L238) |

O RN05-B é o caso mais comum na prática: o usuário abre o formulário de edição
e salva sem mexer no código. Sem a condição P2, a rota "colidiria consigo
mesma" e não poderia ser editada. Nenhum teste exercitava isso.

#### Trecho RN02: só o gestor reativa rota concluída ou cancelada

```js
if (
  data.status === 'ATIVA' &&                              // A
  REATIVAVEL_APENAS_POR_GESTOR.has(existente.status) &&   // B: CONCLUIDA ou CANCELADA
  actor?.perfil !== 'GESTOR'                              // C
) throw new ForbiddenError('... (RN02).');
```

Uma decisão composta de três condições, logo **V(G) do trecho = 3 + 1 = 4**.
Por ser regra de permissão, o trecho também foi levado ao critério **MC/DC**:
para cada condição há um par de testes em que só ela muda e o resultado muda
junto.

| Caso | A: pede ATIVA | B: status atual | C: não é gestor | Saída esperada | Teste |
|---|---|---|---|---|---|
| RN02-A | F | CONCLUIDA | V (operador) | segue | [`update RN02-A`](../controlog-backend/tests/rota.service.test.js#L359) — **novo** |
| RN02-B | V | ATIVA (fora do conjunto) | V (operador) | segue | [`update RN02-B`](../controlog-backend/tests/rota.service.test.js#L348) — **novo** |
| RN02-C | V | CONCLUIDA | F (gestor) | segue | [`update permite reativação...`](../controlog-backend/tests/rota.service.test.js#L110) |
| RN02-D | V | CONCLUIDA | V (operador) | `ForbiddenError` | [`update bloqueia reativação...`](../controlog-backend/tests/rota.service.test.js#L98) |
| RN02-B2 | V | CANCELADA | V (operador) | `ForbiddenError` | [`update RN02-B2`](../controlog-backend/tests/rota.service.test.js#L371) — **novo** |
| RN02-C2 | V | CONCLUIDA | V (sem usuário) | `ForbiddenError` | [`update RN02-C2`](../controlog-backend/tests/rota.service.test.js#L385) — **novo** |

Pares MC/DC, todos comparados com RN02-D, que é o caso bloqueado:

| Condição | Par | O que muda | Resultado |
|---|---|---|---|
| A | RN02-A × RN02-D | só o status pedido | segue × bloqueia |
| B | RN02-B × RN02-D | só o status atual | segue × bloqueia |
| C | RN02-C × RN02-D | só o perfil | segue × bloqueia |

Antes, a condição B nunca tinha sido falsa: no `lcov.info`, o terceiro termo
era avaliado tantas vezes quanto o segundo. Também nenhum teste usava
`CANCELADA`, o segundo valor do conjunto. O RN02-C2 documenta uma decisão de
segurança: sem usuário identificado, o padrão é **bloquear**.

## 5. Os testes novos detectam erro?

Um teste que passa em qualquer situação não prova nada. Para cada lacuna
fechada, o código foi quebrado de propósito (**teste de mutação**), e o teste
correspondente precisava falhar:

| Mutação no código | Teste que falhou |
|---|---|
| `rota.remove` deixa de verificar se a rota existe | `remove C1` |
| RN05 deixa de comparar com o código atual (remove P2) | `update RN05-B` |
| RN02 só considera `CONCLUIDA` (remove `CANCELADA` do conjunto) | `update RN02-B2` |
| RN02 trata ausência de usuário como gestor | `update RN02-C2` |

As quatro mutações foram detectadas, e o código voltou ao original depois.

## 6. Resultado

| Função | V(G) | Caminhos ou casos | Já cobertos | Novos testes | Situação |
|---|---|---|---|---|---|
| `rota.remove` | 3 | 3 | 2 | 1 | ✅ completa |
| `motorista.remove` | 3 | 3 | 3 | 0 | ✅ completa |
| `rota.update`, trecho RN05 | 4 | 4 | 2 | 2 | ✅ completa |
| `rota.update`, trecho RN02 | 4 (MC/DC) | 6 | 2 | 4 | ✅ completa |

Ao todo foram 7 testes novos, no bloco `rota.service — caixa branca` de
[`rota.service.test.js`](../controlog-backend/tests/rota.service.test.js#L281).
O identificador no nome de cada teste (C1, RN05-B, RN02-A...) é o mesmo das
tabelas acima.

## 7. Como reproduzir

```bash
cd controlog-backend

# Suíte inteira com cobertura (relatório em coverage/lcov-report/index.html)
npm run test:coverage

# Só os testes de caixa branca deste documento
npm test -- tests/rota.service.test.js -t "caixa branca"
```

Para ver os desvios de uma função no `coverage/lcov.info`, procure as linhas
`BRDA:<linha>,<bloco>,<desvio>,<vezes>`. Um `0` no último campo é um desvio que
nenhum teste seguiu.
