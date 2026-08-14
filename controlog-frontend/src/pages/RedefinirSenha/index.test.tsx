import { beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import RedefinirSenha from './index';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, post: vi.fn() } };
});
const mockedAxios = vi.mocked(axios, true);

function renderPage(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/redefinir-senha" element={<RedefinirSenha />} />
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
      <Toaster />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RedefinirSenha', () => {
  test('mostra mensagem de link inválido quando não há token na URL', () => {
    renderPage('/redefinir-senha');

    expect(
      screen.getByText('Link de redefinição inválido ou incompleto. Solicite um novo link.')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument();
  });

  test('valida senha curta e senhas que não coincidem', async () => {
    const user = userEvent.setup();
    renderPage('/redefinir-senha?token=abc123');

    await user.type(screen.getByLabelText('Nova senha'), '123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), '456');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(await screen.findByText('Senha deve ter ao menos 8 caracteres.')).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test('redefine a senha com sucesso e navega para o login', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({ data: { message: 'ok' } });

    renderPage('/redefinir-senha?token=abc123');

    await user.type(screen.getByLabelText('Nova senha'), 'novaSenhaSegura123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenhaSegura123');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/redefinir-senha'),
      { token: 'abc123', novaSenha: 'novaSenhaSegura123' }
    );
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });

  test('exibe toast de erro quando o token é inválido ou expirado', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockRejectedValue({
      isAxiosError: true,
      response: { data: { message: 'Token de redefinição inválido ou expirado.' } },
    });

    renderPage('/redefinir-senha?token=expirado');

    await user.type(screen.getByLabelText('Nova senha'), 'novaSenhaSegura123');
    await user.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenhaSegura123');
    await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

    expect(await screen.findByText('Token de redefinição inválido ou expirado.')).toBeInTheDocument();
    expect(screen.queryByText('Tela de login')).not.toBeInTheDocument();
  });
});
