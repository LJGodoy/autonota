import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { FormNuevoEmprendimiento } from './FormNuevoEmprendimiento';

function montar() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FormNuevoEmprendimiento />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FormNuevoEmprendimiento', () => {
  it('debería ofrecer los tres tipos como opciones de un radio', () => {
    montar();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('debería mostrar la info de un tipo sin seleccionarlo', () => {
    montar();
    fireEvent.click(screen.getAllByRole('button', { name: /Más información sobre/ })[0]!);
    expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false);
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});
