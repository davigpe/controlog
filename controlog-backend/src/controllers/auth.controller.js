import { asyncHandler } from '../utils/asyncHandler.js';

export function createAuthController(authService) {
  return {
    register: asyncHandler(async (req, res) => {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    }),

    login: asyncHandler(async (req, res) => {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    }),

    refresh: asyncHandler(async (req, res) => {
      const result = await authService.refresh(req.body.refreshToken);
      res.status(200).json(result);
    }),

    me: asyncHandler(async (req, res) => {
      const usuario = await authService.me(req.user.id);
      res.status(200).json(usuario);
    }),

    forgotPassword: asyncHandler(async (req, res) => {
      await authService.solicitarResetSenha(req.body.email);
      res.status(200).json({
        message: 'Se este e-mail estiver cadastrado, enviaremos um link de redefinição.',
      });
    }),

    resetPassword: asyncHandler(async (req, res) => {
      await authService.redefinirSenha(req.body);
      res.status(200).json({ message: 'Senha redefinida com sucesso.' });
    }),
  };
}
