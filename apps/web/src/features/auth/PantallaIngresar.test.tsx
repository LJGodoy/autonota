import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { FormIngreso } from './PantallaIngresar';

vi.mock('../../lib/sesion', () => ({ useSesion: () => ({ iniciar: vi.fn() }) }));

describe('FormIngreso', () => {
  beforeEach(() => localStorage.clear());

  it('debería precargar el correo guardado y dejar la casilla marcada', () => {
    localStorage.setItem('autonota.correo', 'lu@ejemplo.com');
    render(<FormIngreso />, { wrapper: MemoryRouter });
    expect(screen.getByLabelText('Email')).toHaveValue('lu@ejemplo.com');
    expect(screen.getByLabelText('Recordar mi correo')).toBeChecked();
  });

  it('debería dejar la casilla sin marcar si no hay correo guardado', () => {
    render(<FormIngreso />, { wrapper: MemoryRouter });
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Recordar mi correo')).not.toBeChecked();
  });
});
