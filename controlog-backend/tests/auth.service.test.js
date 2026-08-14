import crypto from 'node:crypto';
import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { createAuthService } from '../src/services/auth.service.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  return {
    usuario: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('auth.service', () => {
  test('register cria um usuário OPERADOR com senha em hash', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue(null);
    prisma.usuario.create.mockImplementation(async ({ data }) => ({
      id: 'user-1',
      ...data,
    }));

    const authService = createAuthService(prisma);
    const result = await authService.register({
      nome: 'Juliana Ferreira',
      email: 'juliana@controlog.com',
      senha: 'senhaSegura123',
    });

    expect(prisma.usuario.create).toHaveBeenCalledTimes(1);
    const dataCriada = prisma.usuario.create.mock.calls[0][0].data;
    expect(dataCriada.perfil).toBe('OPERADOR');
    expect(dataCriada.senhaHash).not.toBe('senhaSegura123');
    expect(await bcrypt.compare('senhaSegura123', dataCriada.senhaHash)).toBe(true);

    expect(result.usuario.email).toBe('juliana@controlog.com');
    expect(result.usuario.senhaHash).toBeUndefined();
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
  });

  test('register rejeita e-mail já cadastrado', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue({ id: 'existing', email: 'juliana@controlog.com' });

    const authService = createAuthService(prisma);

    await expect(
      authService.register({ nome: 'Juliana', email: 'juliana@controlog.com', senha: 'senhaSegura123' })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  test('login autentica com credenciais corretas', async () => {
    const prisma = buildPrismaMock();
    const senhaHash = await bcrypt.hash('senhaSegura123', 12);
    prisma.usuario.findUnique.mockResolvedValue({
      id: 'user-1',
      nome: 'Ricardo Menezes',
      email: 'gestor@controlog.com',
      senhaHash,
      perfil: 'GESTOR',
    });

    const authService = createAuthService(prisma);
    const result = await authService.login({ email: 'gestor@controlog.com', senha: 'senhaSegura123' });

    expect(result.usuario.perfil).toBe('GESTOR');
    expect(result.accessToken).toEqual(expect.any(String));
  });

  test('login rejeita senha incorreta', async () => {
    const prisma = buildPrismaMock();
    const senhaHash = await bcrypt.hash('senhaCorreta', 12);
    prisma.usuario.findUnique.mockResolvedValue({ id: 'user-1', senhaHash, perfil: 'OPERADOR' });

    const authService = createAuthService(prisma);

    await expect(
      authService.login({ email: 'gestor@controlog.com', senha: 'senhaErrada' })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('login rejeita e-mail inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue(null);

    const authService = createAuthService(prisma);

    await expect(
      authService.login({ email: 'ninguem@controlog.com', senha: 'qualquer' })
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test('solicitarResetSenha gera token e grava o hash para usuário existente', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue({ id: 'user-1', email: 'gestor@controlog.com' });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const authService = createAuthService(prisma);
    await authService.solicitarResetSenha('gestor@controlog.com');

    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    const { data } = prisma.usuario.update.mock.calls[0][0];
    expect(data.resetTokenHash).toEqual(expect.any(String));
    expect(data.resetTokenExpiraEm).toBeInstanceOf(Date);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('gestor@controlog.com'));

    logSpy.mockRestore();
  });

  test('solicitarResetSenha não lança erro nem grava nada para e-mail inexistente (evita enumeração)', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue(null);

    const authService = createAuthService(prisma);
    await expect(authService.solicitarResetSenha('ninguem@controlog.com')).resolves.toBeUndefined();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  test('redefinirSenha atualiza a senha e limpa o token quando o token é válido', async () => {
    const prisma = buildPrismaMock();
    const token = 'token-valido';
    prisma.usuario.findFirst.mockResolvedValue({
      id: 'user-1',
      resetTokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      resetTokenExpiraEm: new Date(Date.now() + 60 * 1000),
    });

    const authService = createAuthService(prisma);
    await authService.redefinirSenha({ token, novaSenha: 'novaSenhaSegura123' });

    expect(prisma.usuario.update).toHaveBeenCalledTimes(1);
    const { data } = prisma.usuario.update.mock.calls[0][0];
    expect(data.resetTokenHash).toBeNull();
    expect(data.resetTokenExpiraEm).toBeNull();
    expect(await bcrypt.compare('novaSenhaSegura123', data.senhaHash)).toBe(true);
  });

  test('redefinirSenha rejeita token inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findFirst.mockResolvedValue(null);

    const authService = createAuthService(prisma);
    await expect(
      authService.redefinirSenha({ token: 'invalido', novaSenha: 'novaSenhaSegura123' })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  test('redefinirSenha rejeita token expirado', async () => {
    const prisma = buildPrismaMock();
    prisma.usuario.findFirst.mockResolvedValue({
      id: 'user-1',
      resetTokenHash: 'qualquer',
      resetTokenExpiraEm: new Date(Date.now() - 1000),
    });

    const authService = createAuthService(prisma);
    await expect(
      authService.redefinirSenha({ token: 'expirado', novaSenha: 'novaSenhaSegura123' })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });
});
