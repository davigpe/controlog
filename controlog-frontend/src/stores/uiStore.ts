import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  /** Sidebar recolhida mostra só os ícones, liberando ~192px para o conteúdo. */
  sidebarRecolhida: boolean;
  alternarSidebar: () => void;

  /**
   * No celular a sidebar não cabe ao lado do conteúdo, então vira uma gaveta
   * sobreposta. Este é o estado dela — separado de `sidebarRecolhida`, que
   * continua valendo só a partir de telas grandes.
   */
  menuMobileAberto: boolean;
  abrirMenuMobile: () => void;
  fecharMenuMobile: () => void;
}

/**
 * Preferências de interface que sobrevivem ao recarregamento. Fica separado do
 * authStore de propósito: o logout limpa credenciais, e não faria sentido
 * desfazer junto a escolha de layout de quem estava usando o sistema.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarRecolhida: false,
      alternarSidebar: () => set((estado) => ({ sidebarRecolhida: !estado.sidebarRecolhida })),

      menuMobileAberto: false,
      abrirMenuMobile: () => set({ menuMobileAberto: true }),
      fecharMenuMobile: () => set({ menuMobileAberto: false }),
    }),
    {
      name: 'controlog-ui',
      // Só a preferência de layout é guardada. Sem isto, o zustand persistiria
      // o estado inteiro e a gaveta do celular reabriria sozinha no próximo
      // carregamento, cobrindo a tela sem ninguém ter pedido.
      partialize: (estado) => ({ sidebarRecolhida: estado.sidebarRecolhida }),
    }
  )
);
