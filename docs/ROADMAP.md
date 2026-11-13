# 🔭 Roadmap

Funcionalidades e melhorias planejadas para as próximas iterações do projeto.

## Planejado

* Rastreamento de entregas em tempo real para o cliente final — hoje o acompanhamento é feito pelo gestor, no dashboard, e pelo motorista, na tela "Minhas Rotas"
* Notificações automáticas de mudança de status do pedido. O ícone de sino que existia no cabeçalho foi removido: era um controle sem comportamento, e um botão que não faz nada é pior do que a ausência dele — promete uma função que não existe
* Importação de pedidos a partir de ERP ou planilha, no lugar da geração de pedidos fictícios
* Relatórios de gestão mais detalhados, com exportação (CSV/PDF) e comparação entre períodos
* Motivo da indisponibilidade do traçado real. Quando a OpenRouteService não responde, o mapa cai para linha reta (tracejada) sem dizer por quê — sem chave configurada, serviço fora do ar, cota esgotada e tempo esgotado são indistinguíveis na tela

## Dívidas técnicas conhecidas

* **zod v3 com vulnerabilidade conhecida.** A correção exige a v4, que quebra compatibilidade em todos os validadores do backend — é migração, não `npm audit fix`
* **Bundle do frontend sem divisão de código**, passando de 1 MB. O mapa e os gráficos são os maiores responsáveis e seriam candidatos naturais a carregamento sob demanda
* **Contagem de motoristas em rota na tela de Atribuição** é feita no cliente sobre a página atual (limite de 100). Acima disso, subestimaria — as demais telas já usam consulta própria para os contadores

## Entregue

Itens que estiveram nesta lista e já estão em produção:

* ~~Registro de evidência na entrega~~ — comprovante obrigatório (foto ou PDF) antes de concluir, com a regra aplicada no backend. Versão 1.8.0
* ~~Interface dedicada ao uso em campo pelo motorista, pensada para celular~~ — navegação em gaveta, formulários empilhados e alvos de toque ampliados. Versão 1.8.0
