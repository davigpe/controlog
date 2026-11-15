# Requisitos e casos de uso — Controlog

Catálogo dos requisitos funcionais, não funcionais, regras de negócio e casos de
uso do sistema.

> **Como este documento se relaciona com o RFC.** O RFC do projeto, entregue à
> parte, definiu a numeração original: **RF01–RF14**, as regras de negócio e os
> requisitos não funcionais. Esses itens aparecem referenciados por código ao
> longo do repositório — no [plano de testes](PLANO_DE_TESTES.md), nos serviços e
> nas mensagens de erro — mas o texto que os definia não estava versionado aqui.
> Este documento consolida o catálogo **no repositório**, onde ele fica ao lado
> do código que o implementa.
>
> O que foi acrescentado está identificado: **RF15 em diante** são
> funcionalidades entregues depois do RFC e numeradas aqui pela primeira vez, e o
> mesmo vale para a **RN09** — que nasceu junto da revisão da RN06 — e para as
> **RN10 a RN13**, que já estavam implementadas e verificadas por teste, mas não
> tinham código próprio. As regras marcadas como *revisada* mudaram durante o
> desenvolvimento, com o motivo registrado na seção 4.

---

## 1. Atores

| Ator | Quem é | O que pode fazer |
|---|---|---|
| **Gestor** | Supervisiona a operação, a frota e os resultados (persona Ricardo Menezes) | Tudo. Exclusivo dele: reativar rota concluída ou cancelada, e criar acesso de motorista |
| **Operador** | Executa o planejamento e o acompanhamento do dia a dia | Pedidos, planos, rotas, entregas, clientes, motoristas e frota |
| **Motorista** | Executa as rotas em campo, pelo celular | Apenas as próprias rotas: registrar andamento, anexar comprovante, registrar insucesso |
| **Serviço de roteirização** | OpenRouteService (externo) | Devolve o traçado real sobre a malha viária |
| **Serviço de e-mail** | Amazon SES (externo) | Entrega o e-mail de redefinição de senha |

---

## 2. Requisitos funcionais

### 2.1 Definidos no RFC (RF01–RF14)

| Código | Requisito | Onde está implementado |
|---|---|---|
| **RF01** | Criar rota informando código, origem, destino, motorista, veículo, data/hora e status | `rota.service.js` |
| **RF02** | Editar os dados de uma rota existente | `rota.service.js` |
| **RF03** | Excluir uma rota | `rota.service.js` |
| **RF04** | Consultar os detalhes de uma rota, com origem, destino e coordenadas para o mapa | `rota.service.js`, página *Rotas* |
| **RF05** | Filtrar rotas por código, motorista, cidade ou veículo | `rota.service.js` |
| **RF06** | Alterar o status da rota para Concluída ou Cancelada | `rota.service.js` |
| **RF07** | Consultar o resumo do dashboard: rotas por status, motoristas, veículos e entregas | `dashboard.service.js`, página *Dashboard* |
| **RF08** | Cadastrar, editar e excluir motoristas | `motorista.service.js`, página *Motoristas* |
| **RF09** | Cadastrar, editar e excluir veículos | `veiculo.service.js`, página *Veículos* |
| **RF10** | Exibir origem e destino da rota no mapa | `RotaMapa.tsx` (Leaflet) |
| **RF11** | Cadastrar entrega vinculada a uma rota | `entrega.service.js`, página *Entregas* |
| **RF12** | Vincular a entrega a um motorista | `entrega.service.js` |
| **RF13** | Consultar relatório de rotas e entregas por status, filtrado por período | `relatorio.service.js`, página *Relatórios* |
| **RF14** | Consultar os motoristas mais ativos no período | `relatorio.service.js` |

### 2.2 Entregues depois do RFC (RF15–RF28)

| Código | Requisito | Onde está implementado |
|---|---|---|
| **RF15** | Gerar pedidos de demonstração, vinculados a clientes cadastrados | `pedido.service.js`, página *Pedidos* |
| **RF16** | Agrupar pedidos disponíveis em um plano de distribuição | `plano.service.js`, página *Planos* |
| **RF17** | Otimizar o plano, distribuindo os pedidos em rotas por proximidade, com tamanho de rota configurável | `plano.service.js` (`otimizar`) |
| **RF18** | Mover pedidos entre as rotas de um plano antes da aprovação | `plano.service.js` (`moverPedidos`) |
| **RF19** | Aprovar uma rota do plano, convertendo-a em rota e entregas reais | `plano.service.js` (`aprovarRota`) |
| **RF20** | Aprovar rota deixando motorista e veículo a definir, atribuindo depois | `plano.service.js`, `rota.service.js`, página *Atribuições* |
| **RF21** | Marcar que a rota será feita com veículo próprio, sem consumir a frota | `rota.service.js`, `plano.service.js` |
| **RF22** | Motorista consultar apenas as próprias rotas e suas entregas | `minhasRotas.service.js`, página *Minhas Rotas* |
| **RF23** | Motorista anexar comprovante de entrega (foto ou PDF) e consultá-lo | `comprovante.service.js` |
| **RF24** | Motorista registrar insucesso de entrega, com motivo e observação | `minhasRotas.service.js` (`registrarInsucesso`) |
| **RF25** | Cadastrar, editar e inativar clientes, com endereço e código identificador | `cliente.service.js`, página *Clientes* |
| **RF26** | Solicitar redefinição de senha por e-mail e definir nova senha por link | `auth.service.js`, `services/email/` |
| **RF27** | Consultar as rotas programadas para o dia, com as entregas agrupadas por ponto | `RotasDoDia`, `agruparPorPonto.ts` |
| **RF28** | Consultar a central de ajuda, com perguntas frequentes filtradas por perfil | página *Ajuda* |

---

## 3. Requisitos não funcionais

| Código | Requisito | Como é atendido e verificado |
|---|---|---|
| **RNF03** | A autenticação deve ser *stateless* | JWT com token de acesso de vida curta e token de renovação; o servidor não guarda sessão. Verificado em `tests/app.test.js` |
| **RNF04** | A API deve limitar requisições por IP | `express-rate-limit`: 300 req/min por IP no limite global, com limites menores em login e redefinição de senha. Depende de `TRUST_PROXY=2` para contar o IP certo |
| **RNF06** | A interface deve seguir WCAG 2.1 nível AA | Auditado com `axe-core`, em teste automatizado e em verificação manual. Registro em [AUDITORIA_ACESSIBILIDADE.md](AUDITORIA_ACESSIBILIDADE.md) |
| **RNF07** | A cobertura de testes deve ficar acima de 70% | Medido com `npm run test:coverage`: **88,77%** no backend e **79,89%** no frontend (*statements*, versão 1.10.0) |

> **Lacuna conhecida.** A numeração do RFC começa em RNF01, mas só estes quatro
> aparecem referenciados no repositório. Os demais estão definidos no RFC e não
> foram reproduzidos aqui porque o repositório não guarda o texto original — não
> seria honesto reconstruí-los por dedução, como foi possível fazer com os
> requisitos funcionais a partir do plano de testes.

Além desses, o sistema cumpre requisitos não funcionais decididos durante o
desenvolvimento e registrados em [ARQUITETURA.md](ARQUITETURA.md): TLS com
renovação automática, HSTS, deploy automatizado sem credencial de longa duração,
e isolamento do banco em VPC.

---

## 4. Regras de negócio

| Código | Regra | Onde é aplicada |
|---|---|---|
| **RN01** | Apenas usuários autenticados acessam qualquer funcionalidade do sistema | Middleware de autenticação, em todas as rotas de `/api` exceto `/api/auth` |
| **RN02** | Somente o perfil `GESTOR` pode reativar uma rota Concluída ou Cancelada | `rota.service.js` |
| **RN03** | Não é possível excluir motorista com rota ativa vinculada | `motorista.service.js` — responde 409 |
| **RN04** | Não é possível excluir veículo com rota ativa vinculada | `veiculo.service.js` — responde 409 |
| **RN05** | O código da rota é único | `rota.service.js` — responde 409 |
| **RN06** *(revisada)* | Toda rota exige origem, destino e data/hora. Motorista e veículo são opcionais e podem ser atribuídos depois | `rota.validators.js`, `rota.service.js` |
| **RN07** *(revisada)* | Toda entrega pertence a uma rota. O motorista da entrega acompanha o da rota, e pode ficar indefinido | `entrega.service.js`, `plano.service.js` |
| **RN08** | Não é possível excluir rota com entrega `PENDENTE` ou `EM_TRANSITO` vinculada | `rota.service.js` — responde 409 |
| **RN09** | Uma rota tem veículo da frota **ou** a marcação de veículo próprio, nunca as duas | Validador, serviço e *check constraint* `rotas_veiculo_proprio_sem_frota` no banco |
| **RN10** | A entrega só pode ser concluída com ao menos um comprovante anexado | `minhasRotas.service.js` (`concluirEntrega`) |
| **RN11** | Depois de a entrega ser concluída, o comprovante não pode ser removido | `comprovante.service.js` |
| **RN12** | O motorista acessa somente as próprias rotas, entregas e comprovantes | `minhasRotas.service.js`, `comprovante.service.js` — checagem de propriedade por `motoristaId` |
| **RN13** | Não é possível excluir cliente que já tenha pedidos; o caminho é inativá-lo | `cliente.service.js` |

### Por que a RN06 e a RN07 foram revisadas

A RN06 original exigia motorista **e** veículo para aprovar a rota. Na operação
real isso obrigava a escolher um motorista provisório só para destravar a
aprovação, e trocá-lo mais tarde — **sem registro nenhum de que a escolha fora
provisória**, o que tornava impossível distinguir uma atribuição real de um
valor de preenchimento.

A regra passou a exigir apenas origem, destino e data/hora. A rota pode ficar
explicitamente "a definir", e a atribuição acontece na tela *Atribuições*. A
RN07 mudou junto, porque a entrega herda o motorista da rota: se a rota pode não
ter motorista, a entrega também não pode exigi-lo. A RN09 entrou para cobrir o
caso novo que a revisão criou — o veículo próprio.

---

## 5. Casos de uso

### UC01 — Autenticar no sistema

| | |
|---|---|
| **Ator** | Gestor, Operador ou Motorista |
| **Pré-condição** | Possuir usuário cadastrado e ativo |
| **Requisitos** | RF01 (indireto), RNF03 · **Regras:** RN01 |

**Fluxo principal**
1. O ator informa e-mail e senha.
2. O sistema valida as credenciais.
3. O sistema emite token de acesso e token de renovação.
4. O ator é levado à tela inicial do próprio perfil.

**Fluxos alternativos**
- **A1 — credenciais inválidas:** mensagem genérica, sem indicar se o erro foi no
  e-mail ou na senha. Não revelar qual dos dois estava errado evita a descoberta
  de e-mails cadastrados.
- **A2 — muitas tentativas:** o limite da rota de login responde 429.
- **A3 — token de acesso expirado durante o uso:** o interceptador do cliente
  renova o token e repete a requisição original uma vez, sem o usuário perceber.

---

### UC02 — Redefinir a senha esquecida

| | |
|---|---|
| **Ator** | Qualquer usuário |
| **Pré-condição** | Nenhuma |
| **Requisitos** | RF26 |

**Fluxo principal**
1. O ator informa o e-mail na tela *Esqueci minha senha*.
2. O sistema gera um token de redefinição com validade limitada.
3. O sistema envia o e-mail com o link, via Amazon SES.
4. O ator abre o link, informa a nova senha e confirma.
5. O sistema troca a senha e invalida o token.

**Fluxos alternativos**
- **A1 — e-mail não cadastrado:** o sistema responde **a mesma mensagem de
  sucesso**. Resposta diferente permitiria enumerar usuários, descobrindo quais
  endereços existem um a um.
- **A2 — falha no envio:** registrada no log do servidor, com o destinatário; o
  cliente recebe o mesmo sucesso, pelo mesmo motivo da A1.
- **A3 — token expirado ou já usado:** o sistema recusa e pede nova solicitação.

---

### UC03 — Planejar a distribuição do dia

| | |
|---|---|
| **Ator** | Operador ou Gestor |
| **Pré-condição** | Existir pedido disponível, não vinculado a plano |
| **Requisitos** | RF15, RF16, RF17, RF18 |

**Fluxo principal**
1. O ator gera pedidos ou usa os já existentes. Cada pedido nasce no endereço de
   um cliente ativo cadastrado.
2. O ator cria um plano, escolhendo os pedidos que entram.
3. O ator informa o tamanho de rota desejado e manda otimizar.
4. O sistema agrupa os pedidos em rotas por proximidade e ordena cada rota.
5. O ator revisa no mapa e, se quiser, move pedidos entre rotas.

**Fluxos alternativos**
- **A1 — nenhum cliente ativo:** a geração de pedidos falha com mensagem
  explícita, em vez de inventar um endereço. Inventar reintroduziria o problema
  que o cadastro de clientes resolve: endereço escrito que não corresponde ao
  ponto no mapa.
- **A2 — roteirização externa indisponível:** o sistema usa a distância em linha
  reta para agrupar e ordenar. O resultado continua utilizável, com traçado reto
  no mapa em vez do caminho pela malha viária.

---

### UC04 — Aprovar rota do plano

| | |
|---|---|
| **Ator** | Operador ou Gestor |
| **Pré-condição** | Plano otimizado, com ao menos uma rota |
| **Requisitos** | RF19, RF20, RF21 · **Regras:** RN05, RN06, RN09 |

**Fluxo principal**
1. O ator escolhe uma rota do plano e abre a aprovação.
2. O ator informa origem, destino e data/hora.
3. O ator escolhe uma das três situações de veículo: um veículo da frota,
   **veículo próprio**, ou **a definir**.
4. O ator escolhe um motorista, ou deixa **a definir**.
5. O sistema cria a rota e as entregas correspondentes aos pedidos.

**Fluxos alternativos**
- **A1 — código de rota repetido:** 409, rota não criada (RN05).
- **A2 — veículo próprio marcado junto com veículo da frota:** recusado em três
  camadas — validador, serviço e restrição no banco (RN09).
- **A3 — motorista deixado a definir:** rota e entregas nascem sem motorista, e a
  atribuição acontece no UC05.

---

### UC05 — Atribuir motorista e veículo a uma rota

| | |
|---|---|
| **Ator** | Operador ou Gestor |
| **Pré-condição** | Existir rota com motorista ou veículo a definir |
| **Requisitos** | RF20 · **Regras:** RN06, RN09 |

**Fluxo principal**
1. O ator abre a tela *Atribuições*, que lista as rotas pendentes de definição.
2. O ator escolhe o motorista, o veículo, ou ambos.
3. O sistema atualiza a rota e propaga o motorista para as entregas dela.

**Fluxos alternativos**
- **A1 — desatribuir o motorista:** as entregas da rota também ficam sem
  motorista, para não sobrar entrega apontando para quem não faz mais a rota.

---

### UC06 — Executar entrega e anexar comprovante

| | |
|---|---|
| **Ator** | Motorista |
| **Pré-condição** | Ter rota atribuída com entrega pendente |
| **Requisitos** | RF22, RF23 · **Regras:** RN10, RN11, RN12 |

**Fluxo principal**
1. O motorista abre *Minhas Rotas* e vê apenas as próprias rotas.
2. O motorista seleciona uma entrega.
3. O motorista anexa o comprovante: foto ou PDF.
4. O sistema aceita o arquivo, gerando o nome em disco no servidor.
5. O motorista marca a entrega como concluída.
6. O sistema verifica que existe ao menos um comprovante e conclui a entrega.

**Fluxos alternativos**
- **A1 — concluir sem comprovante:** recusado com 422 e mensagem explícita. A
  verificação é feita no serviço, não apenas desabilitando o botão: a tela é
  conveniência, e uma requisição direta à API contornaria o bloqueio visual.
- **A2 — remover comprovante antes de concluir:** permitido.
- **A3 — remover comprovante depois de concluir:** recusado (RN11). Sem isso,
  daria para concluir com uma foto e apagá-la em seguida, esvaziando a RN10.
- **A4 — tentar abrir comprovante de entrega de outro motorista:** recusado
  (RN12).
- **A5 — arquivo de tipo não aceito ou acima do tamanho limite:** recusado, e o
  arquivo já gravado em disco pelo *upload* é removido.

---

### UC07 — Registrar insucesso de entrega

| | |
|---|---|
| **Ator** | Motorista |
| **Pré-condição** | Ter entrega pendente ou em trânsito |
| **Requisitos** | RF24 · **Regras:** RN12 |

**Fluxo principal**
1. O motorista seleciona a entrega que não foi possível concluir.
2. O motorista escolhe o motivo e pode acrescentar observação.
3. O sistema registra a entrega como `NAO_ENTREGUE`, preservando o motivo.

**Observação.** `NAO_ENTREGUE` é diferente de `CANCELADA`: a entrega continua
existindo e pode ser concluída numa segunda tentativa. O cancelamento é decisão
da gestão, não do motorista.

---

### UC08 — Acompanhar a operação

| | |
|---|---|
| **Ator** | Gestor ou Operador |
| **Pré-condição** | Haver rotas e entregas registradas |
| **Requisitos** | RF04, RF05, RF07, RF10, RF27 |

**Fluxo principal**
1. O ator abre o *Dashboard* e vê as contagens por status.
2. O ator abre *Rotas do Dia* e vê as rotas programadas no mapa.
3. O sistema agrupa no mesmo marcador as entregas que estão no mesmo ponto,
   indicando quantas são.

**Fluxos alternativos**
- **A1 — rota sem motorista ou sem veículo:** exibida como "A definir"; rota com
  veículo próprio é exibida como "Veículo próprio".

---

### UC09 — Encerrar ou reabrir rota

| | |
|---|---|
| **Ator** | Operador (encerrar) · Gestor (reabrir) |
| **Pré-condição** | Rota existente |
| **Requisitos** | RF06 · **Regras:** RN02, RN08 |

**Fluxo principal**
1. O ator muda o status da rota para Concluída ou Cancelada.
2. O sistema persiste o novo status.

**Fluxos alternativos**
- **A1 — operador tenta reabrir rota concluída ou cancelada:** 403 (RN02).
- **A2 — excluir rota com entrega pendente ou em trânsito:** 409 (RN08).

**Observação.** A rota **não** é concluída automaticamente quando todas as
entregas terminam. Uma rota com entregas não entregues ainda pode receber segunda
tentativa, e fechá-la sozinha obrigaria a reabri-la — o que exige gestor (RN02).

---

### UC10 — Manter a base de clientes

| | |
|---|---|
| **Ator** | Operador ou Gestor |
| **Pré-condição** | Nenhuma |
| **Requisitos** | RF25 · **Regras:** RN13 |

**Fluxo principal**
1. O ator cadastra o cliente com código identificador, nome, endereço e
   coordenada.
2. O sistema passa a oferecer esse cliente na geração de pedidos.

**Fluxos alternativos**
- **A1 — excluir cliente com pedidos:** recusado (RN13). Não apagaria nada, mas
  deixaria pedidos órfãos, identificados apenas pelo nome gravado no pedido.
- **A2 — cliente deixou de comprar:** marcar como inativo. Sai das sugestões e o
  histórico permanece inteiro.

---

## 6. Rastreabilidade

Cada requisito e cada regra têm caso de teste correspondente, com o arquivo de
teste nomeado. A matriz completa está em
[PLANO_DE_TESTES.md](PLANO_DE_TESTES.md) — seção 3 para os requisitos
funcionais, seção 4 para as regras de negócio.

| Camada | Ferramenta | O que cobre |
|---|---|---|
| Backend — serviços | Jest, Prisma mockado por injeção | Regras de negócio, validações, mapeamento de erro |
| Backend — HTTP | Jest + Supertest, aplicação real | Status codes, autenticação e autorização fim a fim |
| Frontend | Vitest + Testing Library, API mockada | Telas, formulários, mensagens de erro vindas do backend |

---

## Documentos relacionados

| Documento | O que cobre |
|---|---|
| [ARQUITETURA.md](ARQUITETURA.md) | Diagramas C4, componentes e decisões de arquitetura |
| [PLANO_DE_TESTES.md](PLANO_DE_TESTES.md) | Matriz de casos de teste por requisito e regra |
| [AUDITORIA_ACESSIBILIDADE.md](AUDITORIA_ACESSIBILIDADE.md) | RNF06, conformidade WCAG 2.1 AA |
| [DADOS_DE_DEMONSTRACAO.md](DADOS_DE_DEMONSTRACAO.md) | Origem da base de clientes usada em RF15 e RF25 |
