import { beforeEach, describe, expect, test, vi } from 'vitest';
import axios from 'axios';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import EsqueciSenha from './index';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return { ...actual, default: { ...actual.default, post: vi.fn() } };
});
const mockedAxios = vi.mocked(axios, true);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/esqueci-senha']}>
      <Routes>
        <Route path="/esqueci-senha" element={<EsqueciSenha />} />
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
      <Toaster />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EsqueciSenha', () => {
  test('mostra erro de validação para e-mail vazio/inválido', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }));

    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test('envia o e-mail e mostra mensagem genérica de sucesso', async () => {
    const user = userEvent.setup();
    mockedAxios.post.mockResolvedValue({ data: { message: 'ok' } });

    renderPage();

    await user.type(screen.getByLabelText('E-mail'), 'gestor@controlog.com');
    await user.click(screen.getByRole('button', { name: 'Enviar link de redefinição' }));

    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/esqueci-senha'),
      { email: 'gestor@controlog.com' }
    );
    expect(
      await screen.findByText(/Se este e-mail estiver cadastrado, enviaremos um link/)
    ).toBeInTheDocument();
  });

  test('link "Voltar para o login" navega para /login', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('link', { name: /Voltar para o login/ }));

    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });
});
