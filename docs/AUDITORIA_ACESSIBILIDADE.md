# Auditoria de Acessibilidade — Controlog

Este documento registra a auditoria de acessibilidade realizada para atender à RNF06
do RFC ("A interface deve seguir padrões de acessibilidade WCAG 2.1 nível AA"): o que
foi verificado, o que foi encontrado, o que foi corrigido, e como a conformidade
continua sendo verificada a partir de agora.

## 1. Metodologia

A verificação automática de acessibilidade com `axe-core` rodando em jsdom (sem layout
real do navegador) **não calcula contraste de cor de forma confiável** — é uma
limitação conhecida da ferramenta nesse ambiente. Por isso a auditoria foi feita em
duas camadas:

1. **Auditoria real, em navegador** — `@axe-core/playwright` dirigindo um Chromium
   headless contra a aplicação de verdade (front-end + backend + PostgreSQL reais),
   autenticado como usuário `GESTOR`, cobrindo as regras WCAG 2.0 A/AA e WCAG 2.1 A/AA
   (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`). Essa é a auditoria "de verdade" —
   inclui contraste de cor calculado a partir do CSS renderizado.
2. **Guarda de regressão automatizada** — testes com `vitest-axe` (mesmo motor
   `axe-core`) rodando dentro da suíte Vitest existente, cobrindo a parte estrutural
   (nome acessível de botões/campos, labels de formulário, atributos ARIA válidos) —
   com a regra `color-contrast` desligada, já que o jsdom não confia nela. Ficam em
   `controlog-frontend/src/test/a11y.test.tsx` e rodam a cada `npm test`, prevenindo
   regressão nesses pontos daqui pra frente.

## 2. Escopo da auditoria em navegador

Telas cobertas (usuário não autenticado e autenticado como `GESTOR`):

- Login (estado inicial e com erros de validação exibidos)
- Dashboard
- Rotas — listagem e modal "Nova Rota"
- Motoristas — listagem, modal "Novo Motorista" e modal de Detalhes
- Veículos — listagem e modal "Novo Veículo"
- Entregas — listagem e modal "Nova Entrega"
- Relatórios

## 3. Resultado — antes das correções

| Categoria | O que era | Onde apareceu |
|---|---|---|
| `color-contrast` (sério) | Texto secundário em `gray-400`/`gray-500` abaixo de 4.5:1 em fundo claro (ex.: `#99a1af` sobre branco → 2.6:1) | Praticamente todas as telas — CNH, placas, rótulos de card, subtítulos, cabeçalhos de tabela, rodapé da sidebar |
| `color-contrast` (sério) | Rótulos de cards-resumo com `opacity-80` sobre fundo colorido claro (ex.: verde a 80% de opacidade → 2.48:1) | Cards de resumo em Motoristas e Veículos |
| `color-contrast` (sério) | Mensagens de erro de formulário em `red-500` (3.8:1) | Login e todos os formulários (Rota/Motorista/Veículo/Entrega) |
| `button-name` (crítico) | Botão de notificações (sino) no Header sem texto nem `aria-label` | Todas as páginas autenticadas |
| `button-name` (crítico) | Gatilho do `Select` (Radix) sem nome acessível quando nenhum valor está selecionado | Todos os modais com campo de seleção |
| `label` (crítico) | Campos nativos `<input type="date">`/`type="datetime-local">` sem label associado | Modal "Nova Rota" (Data/Hora), modal "Nova Entrega" (Data prevista) |
| `select-name` (crítico) | `<select>` nativo do filtro de período sem nome acessível | Relatórios |

Total: **26 ocorrências de violação, em 5 regras distintas, espalhadas por 13 estados de tela verificados.**

## 4. Correções aplicadas

- **Contraste de texto secundário** — a variável de tema `--muted-foreground`
  (`controlog-frontend/src/styles/global.css`) foi escurecida, e as ocorrências de
  `text-gray-400`/`text-gray-500` usadas como texto (não ícone) foram trocadas por
  `text-gray-600`/`text-gray-700` conforme o fundo. O rodapé escuro da Sidebar (única
  tela com fundo escuro) foi ajustado na direção oposta (mais claro), já que ali o
  problema era contraste insuficiente contra um fundo escuro.
- **Cards de resumo** — removido o `opacity-80` que diluía a cor do texto; o rótulo
  passou a usar uma cor sólida (`text-gray-700`) independente da cor do card.
- **Mensagens de erro de formulário** — `text-red-500` trocado por `text-red-600` em
  todos os formulários.
- **Botão de notificações** — adicionado `aria-label="Notificações"` no Header; o botão
  de logout ganhou `aria-label="Sair"` complementando o `title` existente.
- **Campos de formulário** — todo par `Label`/`Input`/`Select` nos 4 formulários
  (Rota, Motorista, Veículo, Entrega) e no Login passou a usar `htmlFor`/`id`
  correspondentes, associando programaticamente o rótulo ao campo — não só
  visualmente. Isso resolveu tanto os campos de data nativos quanto os gatilhos do
  `Select`.
- **`<select>` de período em Relatórios** — adicionado `aria-label="Período do
  relatório"`.
- **Modal de detalhes de entrega** — reescrito para usar o componente `Dialog`
  compartilhado (Radix), que já tem foco preso dentro do modal, fechamento com Esc e
  `role="dialog"` corretos — antes era um `<div>` customizado sem nenhuma dessas
  garantias (não pego pelo axe porque ele audita estrutura estática, não
  comportamento de teclado, mas era uma lacuna real de 2.1.2/4.1.2).
- **`aria-describedby` pendente** — todos os modais ganharam uma `DialogDescription`
  (oculta visualmente com `sr-only`, só para leitor de tela) associada ao título,
  eliminando uma referência ARIA que apontava para um elemento que não existia.

Dois itens do axe ficaram como **"incomplete"** (não são violação, a ferramenta não
consegue decidir sozinha) e foram revisados manualmente:

- `aria-hidden-focus` nos "focus guards" do Radix Dialog — comportamento intencional e
  correto do próprio Radix para prender o foco dentro do modal; não é um bug.
- `color-contrast` "incomplete" num número de um dígito só — limitação conhecida do
  axe para amostras de texto muito curtas, não indica problema real.

## 5. Resultado — depois das correções

Reauditoria completa, mesmas 13 telas/estados: **0 violações em todas elas.**

```
[Login] 0 regras violadas
[Login - erros de validação] 0 regras violadas
[Dashboard] 0 regras violadas
[Rotas (listagem)] 0 regras violadas
[Rotas - modal Nova Rota] 0 regras violadas
[Motoristas (listagem)] 0 regras violadas
[Motoristas - modal Novo Motorista] 0 regras violadas
[Motoristas - modal Detalhes] 0 regras violadas
[Veículos (listagem)] 0 regras violadas
[Veículos - modal Novo Veículo] 0 regras violadas
[Entregas (listagem)] 0 regras violadas
[Entregas - modal Nova Entrega] 0 regras violadas
[Relatórios] 0 regras violadas
```

## 6. O que não foi coberto

- **Leitor de tela real** (NVDA/VoiceOver) não foi testado manualmente — a verificação
  foi feita via árvore de acessibilidade e regras automatizadas (axe-core), que cobrem
  a maior parte dos critérios objetivos de WCAG 2.1 AA mas não substituem teste manual
  com tecnologia assistiva real.
- **Navegação por teclado** foi verificada indiretamente (foco preso nos modais via
  Radix, `Escape` fecha diálogos — comportamento padrão da biblioteca) mas não há um
  roteiro de teste manual documentado tecla-a-tecla.
- **Zoom de página / reflow (WCAG 1.4.10)** e **modo de alto contraste do SO** não
  foram verificados.

## 7. Como reproduzir

```bash
# 1. Suba a aplicação completa
cd controlog-backend && docker compose up -d && npm run dev   # terminal 1
cd controlog-frontend && npm run dev                          # terminal 2

# 2. Instale o Playwright + axe-core num diretório à parte (não é dependência do projeto)
npm install playwright @axe-core/playwright axe-core
npx playwright install chromium

# 3. Rode um script que navegue autenticado e chame:
#    new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()
#    em cada tela — ver estrutura de exemplo nesta auditoria.
```

A guarda de regressão (parte estrutural, sem contraste) roda junto da suíte normal:

```bash
cd controlog-frontend
npm test -- a11y   # ou apenas `npm test`, que já inclui src/test/a11y.test.tsx
```
