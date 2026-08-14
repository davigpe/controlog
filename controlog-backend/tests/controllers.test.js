import { jest } from '@jest/globals';
import { createAuthController } from '../src/controllers/auth.controller.js';
import { createDashboardController } from '../src/controllers/dashboard.controller.js';
import { createEntregaController } from '../src/controllers/entrega.controller.js';
import { createMotoristaController } from '../src/controllers/motorista.controller.js';
import { createRelatorioController } from '../src/controllers/relatorio.controller.js';
import { createRotaController } from '../src/controllers/rota.controller.js';
import { createVeiculoController } from '../src/controllers/veiculo.controller.js';

function buildRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('auth.controller', () => {
  test('register responde 201 com o resultado do service', async () => {
    const service = { register: jest.fn().mockResolvedValue({ usuario: { id: 'u1' } }) };
    const controller = createAuthController(service);
    const req = { body: { nome: 'Juliana', email: 'juliana@controlog.com', senha: '12345678' } };
    const res = buildRes();

    await controller.register(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ usuario: { id: 'u1' } });
  });

  test('login encaminha erro do service para next()', async () => {
    const erro = new Error('falhou');
    const service = { login: jest.fn().mockRejectedValue(erro) };
    const controller = createAuthController(service);
    const next = jest.fn();

    await controller.login({ body: {} }, buildRes(), next);

    expect(next).toHaveBeenCalledWith(erro);
  });

  test('me responde com o usuário autenticado', async () => {
    const service = { me: jest.fn().mockResolvedValue({ id: 'u1' }) };
    const controller = createAuthController(service);
    const res = buildRes();

    await controller.me({ user: { id: 'u1' } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ id: 'u1' });
  });

  test('refresh responde com novo access token', async () => {
    const service = { refresh: jest.fn().mockResolvedValue({ accessToken: 'novo-token' }) };
    const controller = createAuthController(service);
    const res = buildRes();

    await controller.refresh({ body: { refreshToken: 'abc' } }, res, jest.fn());

    expect(service.refresh).toHaveBeenCalledWith('abc');
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'novo-token' });
  });

  test('forgotPassword sempre responde 200 com mensagem genérica', async () => {
    const service = { solicitarResetSenha: jest.fn().mockResolvedValue(undefined) };
    const controller = createAuthController(service);
    const res = buildRes();

    await controller.forgotPassword({ body: { email: 'juliana@controlog.com' } }, res, jest.fn());

    expect(service.solicitarResetSenha).toHaveBeenCalledWith('juliana@controlog.com');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
  });

  test('resetPassword responde 200 quando o service redefine a senha', async () => {
    const service = { redefinirSenha: jest.fn().mockResolvedValue(undefined) };
    const controller = createAuthController(service);
    const req = { body: { token: 'abc', novaSenha: 'novaSenhaSegura123' } };
    const res = buildRes();

    await controller.resetPassword(req, res, jest.fn());

    expect(service.redefinirSenha).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('resetPassword encaminha erro do service para next()', async () => {
    const erro = new Error('token inválido');
    const service = { redefinirSenha: jest.fn().mockRejectedValue(erro) };
    const controller = createAuthController(service);
    const next = jest.fn();

    await controller.resetPassword({ body: { token: 'x', novaSenha: 'novaSenhaSegura123' } }, buildRes(), next);

    expect(next).toHaveBeenCalledWith(erro);
  });
});

describe('motorista.controller', () => {
  const buildService = () => ({
    list: jest.fn().mockResolvedValue([{ id: 'm1' }]),
    getById: jest.fn().mockResolvedValue({ id: 'm1' }),
    create: jest.fn().mockResolvedValue({ id: 'm1' }),
    update: jest.fn().mockResolvedValue({ id: 'm1' }),
    remove: jest.fn().mockResolvedValue(undefined),
  });

  test('list, getById, create, update e remove delegam ao service e respondem corretamente', async () => {
    const service = buildService();
    const controller = createMotoristaController(service);
    const res = buildRes();

    await controller.list({ query: {} }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith([{ id: 'm1' }]);

    await controller.getById({ params: { id: 'm1' } }, res, jest.fn());
    expect(service.getById).toHaveBeenCalledWith('m1');

    await controller.create({ body: { nome: 'Carlos' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(201);

    await controller.update({ params: { id: 'm1' }, body: { nome: 'Carlos S.' } }, res, jest.fn());
    expect(service.update).toHaveBeenCalledWith('m1', { nome: 'Carlos S.' });

    await controller.remove({ params: { id: 'm1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});

describe('veiculo.controller', () => {
  test('list, getById, create, update e remove delegam ao service', async () => {
    const service = {
      list: jest.fn().mockResolvedValue([{ id: 'v1' }]),
      getById: jest.fn().mockResolvedValue({ id: 'v1' }),
      create: jest.fn().mockResolvedValue({ id: 'v1' }),
      update: jest.fn().mockResolvedValue({ id: 'v1' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const controller = createVeiculoController(service);
    const res = buildRes();

    await controller.list({ query: {} }, res, jest.fn());
    await controller.getById({ params: { id: 'v1' } }, res, jest.fn());
    await controller.create({ body: {} }, res, jest.fn());
    await controller.update({ params: { id: 'v1' }, body: {} }, res, jest.fn());
    await controller.remove({ params: { id: 'v1' } }, res, jest.fn());

    expect(service.list).toHaveBeenCalled();
    expect(service.getById).toHaveBeenCalledWith('v1');
    expect(service.create).toHaveBeenCalled();
    expect(service.update).toHaveBeenCalledWith('v1', {});
    expect(service.remove).toHaveBeenCalledWith('v1');
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('rota.controller', () => {
  test('update repassa req.user como ator para o service (RN02)', async () => {
    const service = {
      list: jest.fn().mockResolvedValue([]),
      getById: jest.fn().mockResolvedValue({ id: 'r1' }),
      create: jest.fn().mockResolvedValue({ id: 'r1' }),
      update: jest.fn().mockResolvedValue({ id: 'r1' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const controller = createRotaController(service);
    const res = buildRes();
    const req = { params: { id: 'r1' }, body: { status: 'ATIVA' }, user: { perfil: 'GESTOR' } };

    await controller.update(req, res, jest.fn());

    expect(service.update).toHaveBeenCalledWith('r1', { status: 'ATIVA' }, { perfil: 'GESTOR' });

    await controller.list({ query: {} }, res, jest.fn());
    await controller.getById({ params: { id: 'r1' } }, res, jest.fn());
    await controller.create({ body: {} }, res, jest.fn());
    await controller.remove({ params: { id: 'r1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('entrega.controller', () => {
  test('list, getById, create, update e remove delegam ao service', async () => {
    const service = {
      list: jest.fn().mockResolvedValue([]),
      getById: jest.fn().mockResolvedValue({ id: 'e1' }),
      create: jest.fn().mockResolvedValue({ id: 'e1' }),
      update: jest.fn().mockResolvedValue({ id: 'e1' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const controller = createEntregaController(service);
    const res = buildRes();

    await controller.list({ query: {} }, res, jest.fn());
    await controller.getById({ params: { id: 'e1' } }, res, jest.fn());
    await controller.create({ body: {} }, res, jest.fn());
    await controller.update({ params: { id: 'e1' }, body: {} }, res, jest.fn());
    await controller.remove({ params: { id: 'e1' } }, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('dashboard.controller e relatorio.controller', () => {
  test('getResumo responde com o resumo do service', async () => {
    const service = { getResumo: jest.fn().mockResolvedValue({ totalMotoristas: 2 }) };
    const controller = createDashboardController(service);
    const res = buildRes();

    await controller.getResumo({}, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ totalMotoristas: 2 });
  });

  test('getRelatorio responde com o relatório do service', async () => {
    const service = { getRelatorio: jest.fn().mockResolvedValue({ totalEntregas: 10 }) };
    const controller = createRelatorioController(service);
    const res = buildRes();

    await controller.getRelatorio({ query: {} }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ totalEntregas: 10 });
  });
});
