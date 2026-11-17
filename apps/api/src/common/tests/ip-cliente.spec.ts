import { obtenerIpCliente } from '../auth/ip-cliente';

describe('obtenerIpCliente', () => {
  it('debería usar la IP real que agrega Vercel e ignorar el X-Forwarded-For falsificado', () => {
    const ip = obtenerIpCliente({
      ip: '54.232.129.204',
      headers: {
        'x-vercel-id': 'gru1::abc',
        'x-vercel-forwarded-for': '203.0.113.5',
        'x-forwarded-for': '198.51.100.77,54.232.129.204, 162.159.114.41, 10.26.27.5',
      },
    });
    expect(ip).toBe('203.0.113.5');
  });

  it('debería usar req.ip cuando la petición no viene de Vercel', () => {
    expect(obtenerIpCliente({ ip: '203.0.113.9', headers: {} })).toBe('203.0.113.9');
  });

  it('debería ignorar x-vercel-forwarded-for si falta x-vercel-id', () => {
    expect(
      obtenerIpCliente({ ip: '203.0.113.9', headers: { 'x-vercel-forwarded-for': '1.2.3.4' } }),
    ).toBe('203.0.113.9');
  });

  it('debería tomar la primera IP si el encabezado trae una lista', () => {
    expect(
      obtenerIpCliente({
        ip: '54.0.0.1',
        headers: { 'x-vercel-id': 'x', 'x-vercel-forwarded-for': '203.0.113.5, 10.0.0.1' },
      }),
    ).toBe('203.0.113.5');
  });
});
