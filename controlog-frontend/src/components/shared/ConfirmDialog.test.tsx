import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  test('não renderiza conteúdo quando open é false', () => {
    render(
      <ConfirmDialog
        open={false}
        title="Excluir motorista"
        description="Tem certeza?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.queryByText('Excluir motorista')).not.toBeInTheDocument();
  });

  test('exibe título, descrição e chama onConfirm ao confirmar', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Excluir motorista"
        description="Motoristas com rotas ativas não podem ser excluídos (RN03)."
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Excluir motorista')).toBeInTheDocument();
    expect(screen.getByText(/RN03/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('chama onCancel ao clicar em Cancelar', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Excluir rota"
        description="Tem certeza?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('chama onCancel ao fechar com Escape (onOpenChange)', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open
        title="Excluir rota"
        description="Tem certeza?"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    );

    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test('desabilita os botões e mostra "Excluindo..." quando loading', () => {
    render(
      <ConfirmDialog
        open
        title="Excluir"
        description="Tem certeza?"
        loading
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Excluindo...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
