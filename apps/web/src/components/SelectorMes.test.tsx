import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectorMes } from './SelectorMes';

describe('SelectorMes', () => {
  it('debería mostrar el mes elegido y moverse al anterior y al siguiente', () => {
    const alCambiar = vi.fn();
    render(<SelectorMes etiqueta="Mes" valor="2026-01" alCambiar={alCambiar} />);
    expect(screen.getByLabelText('Mes', { selector: 'select' })).toHaveValue('1');
    fireEvent.click(screen.getByRole('button', { name: /anterior/ }));
    expect(alCambiar).toHaveBeenLastCalledWith('2025-12');
    fireEvent.click(screen.getByRole('button', { name: /siguiente/ }));
    expect(alCambiar).toHaveBeenLastCalledWith('2026-02');
  });

  it('debería cambiar el año sin cambiar el mes', () => {
    const alCambiar = vi.fn();
    render(<SelectorMes etiqueta="Mes" valor="2026-11" alCambiar={alCambiar} />);
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2025' } });
    expect(alCambiar).toHaveBeenCalledWith('2025-11');
  });
});
