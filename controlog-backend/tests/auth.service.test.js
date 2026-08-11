import { jest } from '@jest/globals';
import bcrypt from 'bcryptjs';
import { createAuthService } from '../src/services/auth.service.js';
import { ConflictError, UnauthorizedError } from '../src/utils/AppError.js';

function buildPrismaMock() {
  return {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
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
});
