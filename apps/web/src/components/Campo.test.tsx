import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Campo } from './Campo';
import { EtiquetaEstadoTurno, MarcaPrioridad } from './EtiquetaEstado';

describe('Campo', () => {
  it('debería asociar la etiqueta y el error al campo para lectores de pantalla', () => {
    render(<Campo etiqueta="Email" error="Formato inválido" />);
    const campo = screen.getByLabelText('Email');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAccessibleDescription('✗ Formato inválido');
  });
});

describe('identidad visual de estados', () => {
  it('debería distinguir el turno realizado con una tilde y no solo por color', () => {
    render(<EtiquetaEstadoTurno estado="REALIZADO" />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('debería marcar la prioridad con signos y texto alternativo', () => {
    render(<MarcaPrioridad prioridad="ALTA" />);
    expect(screen.getByRole('img', { name: 'Prioridad alta' })).toHaveTextContent('!!!');
  });
});
