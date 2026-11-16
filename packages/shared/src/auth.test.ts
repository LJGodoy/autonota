import { describe, expect, it } from 'vitest';
import { esquemaRegistro, esquemaPassword } from './auth';
import { esquemaCrearEmprendimiento } from './emprendimientos';

describe('esquemaPassword', () => {
  it('debería aceptar una contraseña con letras y números de 8 caracteres', () => {
    expect(esquemaPassword.safeParse('Tintura2026').success).toBe(true);
  });

  it('debería rechazar una contraseña sin números', () => {
    expect(esquemaPassword.safeParse('soloLetras').success).toBe(false);
  });

  it('debería rechazar una contraseña de más de 72 caracteres', () => {
    expect(esquemaPassword.safeParse('a1'.repeat(37)).success).toBe(false);
  });
});

describe('esquemaRegistro', () => {
  const base = { nombre: 'Laura', email: 'laura@mail.com', password: 'Tintura2026' };

  it('debería exigir que se acepte la política', () => {
    expect(esquemaRegistro.safeParse({ ...base, aceptaPolitica: false }).success).toBe(false);
    expect(esquemaRegistro.safeParse({ ...base, aceptaPolitica: true }).success).toBe(true);
  });

  it('debería rechazar campos no declarados', () => {
    expect(esquemaRegistro.safeParse({ ...base, aceptaPolitica: true, rol: 'admin' }).success).toBe(
      false,
    );
  });
});

describe('esquemaCrearEmprendimiento', () => {
  it('debería rechazar un tipo de negocio inexistente', () => {
    expect(esquemaCrearEmprendimiento.safeParse({ nombre: 'X', tipo: 'SERVICIOS' }).success).toBe(
      false,
    );
  });
});
