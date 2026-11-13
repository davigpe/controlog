import type { Perfil } from '@/lib/perfil';

/**
 * Perguntas frequentes.
 *
 * O conteúdo é específico deste sistema: cada resposta descreve uma regra que
 * o Controlog realmente aplica. Texto genérico de ajuda não resolve o problema
 * de quem chegou aqui — quem abre a central de ajuda está travado numa tela,
 * e quase sempre porque uma regra de negócio agiu sem explicar o porquê.
 *
 * `perfis` controla a quem a pergunta é mostrada: o motorista não precisa ler
 * sobre aprovação de plano, e mostrar isso a ele só esconde o que lhe importa.
 */

export interface Pergunta {
  id: string;
  pergunta: string;
  /** Parágrafos da resposta. */
  resposta: string[];
  perfis: Perfil[];
  categoria: string;
}

const TODOS: Perfil[] = ['GESTOR', 'OPERADOR', 'MOTORISTA'];
const GESTAO: Perfil[] = ['GESTOR', 'OPERADOR'];

export const PERGUNTAS: Pergunta[] = [
  // ── Entregas ──
  {
    id: 'comprovante-obrigatorio',
    categoria: 'Entregas',
    perfis: TODOS,
    pergunta: 'Por que o botão "Concluir" da entrega está desabilitado?',
    resposta: [
      'Toda entrega precisa de ao menos um comprovante antes de ser concluída: a foto do canhoto assinado, do volume no destino, ou um PDF.',
      'Use "Anexar comprovante" no item da entrega. Assim que o primeiro anexo subir, o botão libera.',
      'A regra vale no servidor, não só na tela — não há como concluir sem comprovante por outro caminho.',
    ],
  },
  {
    id: 'comprovante-formatos',
    categoria: 'Entregas',
    perfis: TODOS,
    pergunta: 'Que arquivos posso anexar como comprovante, e de que tamanho?',
    resposta: [
      'JPEG, PNG, WebP, HEIC ou PDF, até 8 MB por arquivo e no máximo 5 por entrega.',
      'Fotos tiradas pelo celular são reduzidas automaticamente antes do envio, então não é preciso se preocupar com o tamanho nem com a qualidade da conexão na rua.',
    ],
  },
  {
    id: 'remover-comprovante',
    categoria: 'Entregas',
    perfis: TODOS,
    pergunta: 'Anexei o comprovante errado. Dá para trocar?',
    resposta: [
      'Sim, enquanto a entrega não estiver concluída: toque no ícone de lixeira no canto do anexo e envie o correto.',
      'Depois de concluída, o comprovante não pode mais ser removido — ele passa a ser o registro do que aconteceu. Se houver erro numa entrega já concluída, fale com o gestor.',
    ],
  },
  {
    id: 'insucesso',
    categoria: 'Entregas',
    perfis: TODOS,
    pergunta: 'Qual a diferença entre "Não entregue" e cancelar a entrega?',
    resposta: [
      '"Não entregue" registra uma tentativa que falhou: o cliente estava ausente, o endereço não foi encontrado, a mercadoria foi recusada. A entrega continua existindo e pode ser concluída numa segunda tentativa.',
      'Cancelar é diferente: é o pedido que não vai sair. Só o gestor faz isso, pela tela de Entregas.',
    ],
  },

  // ── Rotas ──
  {
    id: 'rota-sem-motorista',
    categoria: 'Rotas',
    perfis: GESTAO,
    pergunta: 'Posso aprovar uma rota antes de saber quem vai dirigir?',
    resposta: [
      'Pode. Na aprovação, escolha "A definir" no motorista e no veículo.',
      'A rota é criada e as entregas também, sem dono. Quando decidir, use Operação → Atribuição de Rotas: ao atribuir o motorista, as entregas daquela rota vão junto automaticamente.',
    ],
  },
  {
    id: 'veiculo-proprio',
    categoria: 'Rotas',
    perfis: GESTAO,
    pergunta: 'O que significa "Veículo próprio" na rota?',
    resposta: [
      'Que o motorista usou um veículo que não é da frota — o carro dele, por exemplo.',
      'A rota existe e é acompanhada normalmente, mas não consome a disponibilidade da frota nem aparece nos números de uso de veículo. É por isso que a opção existe em vez de cadastrar um veículo falso.',
    ],
  },
  {
    id: 'motorista-nao-ve-rota',
    categoria: 'Rotas',
    perfis: GESTAO,
    pergunta: 'O motorista diz que não está vendo a rota dele. O que verificar?',
    resposta: [
      'Três coisas, nesta ordem: se a rota tem ele como motorista atribuído (Atribuição de Rotas), se o status da rota é Ativa, e se ele tem acesso criado (Cadastros → Motoristas → ícone de chave).',
      'A tela "Minhas Rotas" mostra apenas as rotas atribuídas ao próprio motorista logado. Isso é aplicado no servidor: não é uma questão de filtro de tela.',
    ],
  },
  {
    id: 'tracado-tracejado',
    categoria: 'Rotas',
    perfis: GESTAO,
    pergunta: 'Por que o traçado no mapa aparece como linha reta tracejada?',
    resposta: [
      'Linha contínua é o trajeto real pelas ruas. Tracejada é uma estimativa em linha reta entre os pontos.',
      'O traçado real vem de um serviço externo de roteamento. Quando ele não responde — fora do ar, limite de requisições atingido ou chave não configurada —, o sistema não trava: cai para a estimativa e segue funcionando. A ordem das entregas continua otimizada nos dois casos.',
    ],
  },

  // ── Planejamento ──
  {
    id: 'pedido-para-rota',
    categoria: 'Planejamento',
    perfis: GESTAO,
    pergunta: 'Como um pedido vira uma rota de verdade?',
    resposta: [
      'O caminho é: Pedidos → selecionar os pedidos → criar um Plano → otimizar → aprovar cada rota do plano.',
      'Aprovar transforma o grupo numa Rota real (código RT-XXX) e cria uma Entrega por pedido. A partir daí ela aparece em Rotas, no Dashboard e nos Relatórios.',
    ],
  },
  {
    id: 'ajustar-agrupamento',
    categoria: 'Planejamento',
    perfis: GESTAO,
    pergunta: 'O agrupamento automático das rotas não ficou bom. Dá para ajustar?',
    resposta: [
      'Sim. No detalhe do plano, desenhe um polígono no mapa em volta dos pedidos que quer mover: a seleção pode virar uma rota nova, ser movida para outra rota existente ou ser desatribuída.',
      'O número de rotas é definido pelo tamanho máximo que você informa ao otimizar — menos pedidos por rota significa mais rotas.',
    ],
  },

  // ── Cadastros ──
  {
    id: 'acesso-motorista',
    categoria: 'Cadastros',
    perfis: GESTAO,
    pergunta: 'Como dou acesso ao sistema para um motorista?',
    resposta: [
      'Cadastros → Motoristas → ícone de chave no cartão do motorista. Informe o e-mail e uma senha inicial.',
      'Criar acesso é restrito ao perfil Gestor. O motorista passa a entrar com esse e-mail e vê apenas "Minhas Rotas".',
    ],
  },
  {
    id: 'importar-planilha',
    categoria: 'Cadastros',
    perfis: GESTAO,
    pergunta: 'Posso cadastrar vários motoristas de uma vez?',
    resposta: [
      'Pode, por planilha: Cadastros → Motoristas → "Importar planilha". O arquivo precisa ter as colunas nome, CNH e telefone.',
      'O limite é de 500 linhas por envio. Linhas com erro são apontadas uma a uma, com o motivo, e as válidas são importadas mesmo assim.',
    ],
  },
  {
    id: 'excluir-com-vinculo',
    categoria: 'Cadastros',
    perfis: GESTAO,
    pergunta: 'Não consigo excluir um motorista ou veículo. Por quê?',
    resposta: [
      'Porque existe uma rota ativa vinculada a ele. Excluir deixaria essa rota sem responsável e quebraria o histórico.',
      'Conclua ou cancele as rotas vinculadas, ou reatribua a rota a outro motorista, e então a exclusão é liberada. Se a pessoa apenas saiu da operação, o caminho melhor é mudar o status para Inativo em vez de excluir: o histórico de entregas dela continua válido.',
    ],
  },

  // ── Acesso ──
  {
    id: 'esqueci-senha',
    categoria: 'Acesso',
    perfis: TODOS,
    pergunta: 'Esqueci minha senha. Como recupero?',
    resposta: [
      'Na tela de login, use "Esqueci minha senha" e informe o e-mail cadastrado. Chega uma mensagem com um link para escolher uma senha nova.',
      'O link vale por 1 hora e só funciona uma vez. Se expirar, basta pedir outro.',
      'A tela sempre confirma o pedido, mesmo que o e-mail não esteja cadastrado — isso é proposital, para que ninguém possa descobrir quais endereços existem no sistema testando um por um.',
    ],
  },
  {
    id: 'perfis',
    categoria: 'Acesso',
    perfis: TODOS,
    pergunta: 'Qual a diferença entre Gestor, Operador e Motorista?',
    resposta: [
      'O Motorista vê apenas "Minhas Rotas", com as rotas atribuídas a ele, e registra conclusão ou insucesso das próprias entregas.',
      'O Operador enxerga toda a operação e faz o trabalho do dia a dia: cadastros, planejamento, atribuição e acompanhamento.',
      'O Gestor faz tudo o que o Operador faz, mais duas coisas restritas: criar acesso de motorista e reativar uma rota já concluída ou cancelada.',
    ],
  },
];

export const CATEGORIAS = [...new Set(PERGUNTAS.map((p) => p.categoria))];
