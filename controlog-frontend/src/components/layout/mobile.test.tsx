import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import Header from './Header';
import Sidebar from './Sidebar';

/**
 * O setup global responde `true` a consultas de largura mínima, porque os
 * testes antigos assumem desktop. Aqui o oposto: simula um celular, que é
 * onde a gaveta existe.
 */
function simularCelular() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

const matchMediaOriginal = window.matchMedia;

beforeEach(() => {
  useAuthStore.setState({
    usuario: { id: 'u1', nome: 'Marcos Oliveira', email: 'm@x.com', perfil: 'MOTORISTA' },
    accessToken: 't',
    refreshToken: 'r',
  });
  useUiStore.setState({ sidebarRecolhida: false, menuMobileAberto: false });
});

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMediaOriginal,
  });
  vi.restoreAllMocks();
});

function renderizar(ui: React.ReactNode, rota = '/minhas-rotas') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="*" element={<>{ui}</>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('menu no celular', () => {
  test('o botão de abrir menu existe no header', async () => {
    renderizar(<Header />);
    expect(screen.getByRole('button', { name: /abrir menu/i })).toBeInTheDocument();
  });

  test('tocar no botão abre a gaveta', async () => {
    const user = userEvent.setup();
    renderizar(<Header />);

    expect(useUiStore.getState().menuMobileAberto).toBe(false);
    await user.click(screen.getByRole('button', { name: /abrir menu/i }));
    expect(useUiStore.getState().menuMobileAberto).toBe(true);
  });

  // A gaveta sobreposta precisa de uma saída óbvia; sem isto o motorista
  // ficaria preso nela num aparelho sem botão de voltar.
  test('Esc fecha a gaveta aberta', async () => {
    const user = userEvent.setup();
    useUiStore.setState({ menuMobileAberto: true });
    renderizar(<Sidebar />);

    await user.keyboard('{Escape}');
    expect(useUiStore.getState().menuMobileAberto).toBe(false);
  });

  // No celular a sidebar é uma gaveta de largura inteira. Aplicar ali a
  // preferência de recolher — marcada noutro aparelho — deixaria o motorista
  // com ícones sem rótulo.
  test('a preferência de recolher não se aplica no celular', () => {
    simularCelular();
    useUiStore.setState({ sidebarRecolhida: true, menuMobileAberto: true });
    renderizar(<Sidebar />);

    // Com recolhida valendo, "Minhas Rotas" seria sr-only. Aqui tem de estar
    // visível como texto do link.
    const link = screen.getByRole('link', { name: 'Minhas Rotas' });
    expect(link.textContent).toContain('Minhas Rotas');
    expect(link.querySelector('.sr-only')).toBeNull();
  });

  test('no desktop a preferência de recolher continua valendo', () => {
    useUiStore.setState({ sidebarRecolhida: true });
    renderizar(<Sidebar />);

    const link = screen.getByRole('link', { name: 'Minhas Rotas' });
    // Recolhida, o rótulo vira sr-only: some da tela, mas segue nomeando o
    // link para quem usa leitor de tela.
    expect(link.querySelector('.sr-only')).not.toBeNull();
  });
});

describe('estado da gaveta não é persistido', () => {
  // Se o zustand persistisse tudo, a gaveta reabriria sozinha no próximo
  // carregamento, cobrindo a tela sem ninguém ter pedido.
  test('menuMobileAberto fica fora do localStorage', () => {
    useUiStore.setState({ menuMobileAberto: true, sidebarRecolhida: true });
    const guardado = window.localStorage.getItem('controlog-ui') ?? '';
    expect(guardado).toContain('sidebarRecolhida');
    expect(guardado).not.toContain('menuMobileAberto');
  });
});
