import { jest } from '@jest/globals';

import { createEmailService, escolherTransporte } from '../src/services/email/index.js';
import { escaparHtml, modeloRedefinicaoDeSenha } from '../src/services/email/modelos.js';
import { criarTransporteSes } from '../src/services/email/transportes.js';
import { createAuthService } from '../src/services/auth.service.js';

const LINK = 'https://controlog.app/redefinir-senha?token=abc123';

function transporteFalso(comportamento = {}) {
  return {
    nome: 'falso',
    enviar: jest.fn(async (msg) => {
      if (comportamento.falhar) throw new Error('SES fora do ar');
      comportamento.ultima = msg;
      return { id: 'msg-1', simulado: false };
    }),
  };
}

describe('modelo de redefinição de senha', () => {
  const msg = modeloRedefinicaoDeSenha({ link: LINK, validadeMinutos: 60 });

  test('o link aparece nas duas versões, texto e HTML', () => {
    expect(msg.texto).toContain(LINK);
    expect(msg.html).toContain(LINK);
  });

  // Só HTML pesa no filtro de spam, e a versão em texto é o que aparece na
  // pré-visualização do cliente e para quem usa leitor de tela.
  test('traz as duas versões preenchidas', () => {
    expect(msg.texto.length).toBeGreaterThan(50);
    expect(msg.html).toMatch(/^<!doctype html>/i);
  });

  test('diz a validade e que o uso é único', () => {
    expect(msg.texto).toMatch(/60 minutos/);
    expect(msg.texto).toMatch(/uma vez/i);
  });

  // Quem não pediu a redefinição precisa saber que não há nada a fazer.
  test('tranquiliza quem não fez o pedido', () => {
    expect(msg.texto).toMatch(/sua senha continua a mesma/i);
  });

  test('o assunto identifica o produto', () => {
    expect(msg.assunto).toMatch(/Controlog/);
  });
});

describe('escaparHtml', () => {
  // Hoje o único valor interpolado é um link gerado por nós. O escape existe
  // porque um modelo de e-mail é onde isso muda sem ninguém notar — um nome
  // de usuário no corpo, por exemplo.
  test.each([
    ['<script>', '&lt;script&gt;'],
    ['a&b', 'a&amp;b'],
    ['"aspas"', '&quot;aspas&quot;'],
    ["'simples'", '&#39;simples&#39;'],
  ])('escapa %s', (entrada, esperado) => {
    expect(escaparHtml(entrada)).toBe(esperado);
  });
});

describe('createEmailService', () => {
  test('entrega a mensagem ao transporte', async () => {
    const t = transporteFalso();
    const service = createEmailService({ transporte: t });

    const r = await service.enviarRedefinicaoDeSenha({ para: 'a@b.com', link: LINK, validadeMinutos: 60 });

    expect(r.enviado).toBe(true);
    expect(t.enviar).toHaveBeenCalledTimes(1);
    const msg = t.enviar.mock.calls[0][0];
    expect(msg.para).toBe('a@b.com');
    expect(msg.html).toContain(LINK);
  });

  // Propagar o erro faria o endpoint responder diferente para e-mail
  // cadastrado e não cadastrado — exatamente a enumeração de usuários que ele
  // evita.
  test('falha de envio não lança: devolve enviado=false e registra', async () => {
    const logger = { error: jest.fn(), log: jest.fn() };
    const service = createEmailService({ transporte: transporteFalso({ falhar: true }), logger });

    const r = await service.enviarRedefinicaoDeSenha({ para: 'a@b.com', link: LINK, validadeMinutos: 60 });

    expect(r.enviado).toBe(false);
    expect(logger.error).toHaveBeenCalled();
    // O destinatário vai para o log, senão não há o que investigar.
    expect(String(logger.error.mock.calls[0])).toContain('a@b.com');
  });
});

describe('escolherTransporte', () => {
  test('registro é o padrão, para desenvolvimento e teste', () => {
    expect(escolherTransporte('registro').nome).toBe('registro');
  });

  test('ses é selecionável', () => {
    expect(escolherTransporte('ses').nome).toBe('ses');
  });

  // Descobrir o erro de configuração só quando alguém esquece a senha
  // significaria um usuário travado em vez de um deploy recusado.
  test('nome inválido falha na escolha, não no primeiro envio', () => {
    expect(() => escolherTransporte('sendgrid')).toThrow(/EMAIL_TRANSPORTE/);
  });
});

describe('transporte SES', () => {
  function clienteFalso() {
    return { send: jest.fn(async () => ({ MessageId: 'ses-1' })) };
  }

  test('monta o comando com destinatário, assunto e os dois corpos', async () => {
    const client = clienteFalso();
    const t = criarTransporteSes({ client, remetente: 'Controlog <nao-responda@controlog.app>' });

    await t.enviar({ para: 'x@y.com', assunto: 'Oi', texto: 'texto', html: '<b>html</b>' });

    const entrada = client.send.mock.calls[0][0].input;
    expect(entrada.FromEmailAddress).toBe('Controlog <nao-responda@controlog.app>');
    expect(entrada.Destination.ToAddresses).toEqual(['x@y.com']);
    expect(entrada.Content.Simple.Subject.Data).toBe('Oi');
    expect(entrada.Content.Simple.Body.Text.Data).toBe('texto');
    expect(entrada.Content.Simple.Body.Html.Data).toBe('<b>html</b>');
    // UTF-8 explícito: sem isso, acento no assunto chega corrompido.
    expect(entrada.Content.Simple.Subject.Charset).toBe('UTF-8');
  });

  test('devolve o id da mensagem', async () => {
    const t = criarTransporteSes({ client: clienteFalso() });
    await expect(t.enviar({ para: 'x@y.com', assunto: 'a', texto: 'b', html: 'c' })).resolves.toMatchObject({
      id: 'ses-1',
      simulado: false,
    });
  });
});

describe('esqueci minha senha envia o e-mail', () => {
  function prismaComUsuario(usuario) {
    return {
      usuario: {
        findUnique: jest.fn(async () => usuario),
        update: jest.fn(async () => usuario),
      },
    };
  }

  test('manda o link para o e-mail do usuário', async () => {
    const emailService = { enviarRedefinicaoDeSenha: jest.fn(async () => ({ enviado: true })) };
    const prisma = prismaComUsuario({ id: 'u1', email: 'davi@exemplo.com' });
    const service = createAuthService(prisma, { emailService });

    await service.solicitarResetSenha('davi@exemplo.com');

    expect(emailService.enviarRedefinicaoDeSenha).toHaveBeenCalledTimes(1);
    const arg = emailService.enviarRedefinicaoDeSenha.mock.calls[0][0];
    expect(arg.para).toBe('davi@exemplo.com');
    expect(arg.link).toMatch(/\/redefinir-senha\?token=[0-9a-f]{64}$/);
    expect(arg.validadeMinutos).toBe(60);
  });

  // RN — o endpoint não pode revelar quais e-mails existem.
  test('e-mail desconhecido não dispara envio nem erro', async () => {
    const emailService = { enviarRedefinicaoDeSenha: jest.fn() };
    const service = createAuthService(prismaComUsuario(null), { emailService });

    await expect(service.solicitarResetSenha('nao-existe@exemplo.com')).resolves.toBeUndefined();
    expect(emailService.enviarRedefinicaoDeSenha).not.toHaveBeenCalled();
  });

  test('falha no envio não quebra a resposta ao usuário', async () => {
    const emailService = { enviarRedefinicaoDeSenha: jest.fn(async () => ({ enviado: false })) };
    const prisma = prismaComUsuario({ id: 'u1', email: 'davi@exemplo.com' });
    const service = createAuthService(prisma, { emailService });

    await expect(service.solicitarResetSenha('davi@exemplo.com')).resolves.toBeUndefined();
  });
});
