import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alTerminarSesion, api, ErrorApi, establecerAccessToken } from './api';

function respuesta(status: number, cuerpo?: unknown): Response {
  return new Response(cuerpo === undefined ? null : JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const noAutenticado = () =>
  respuesta(401, { error: { code: 'NO_AUTENTICADO', message: 'x', details: [] } });

describe('cliente HTTP', () => {
  let fetchFalso: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);
    establecerAccessToken('vencido');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    establecerAccessToken(null);
  });

  it('debería hacer un solo refresh cuando varias peticiones reciben 401 a la vez (CU-02)', async () => {
    let refrescos = 0;
    fetchFalso.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refrescos += 1;
        await new Promise((r) => setTimeout(r, 10));
        return respuesta(200, { accessToken: 'nuevo' });
      }
      const auth = (init.headers as Record<string, string>).Authorization;
      return auth === 'Bearer nuevo' ? respuesta(200, { ok: url }) : noAutenticado();
    });

    const resultados = await Promise.all([
      api('/emprendimientos'),
      api('/auth/me'),
      api('/emprendimientos/1'),
    ]);
    expect(refrescos).toBe(1);
    expect(resultados).toHaveLength(3);
  });

  it('debería avisar que terminó la sesión si el refresh falla', async () => {
    fetchFalso.mockImplementation(async (url: string) =>
      url.endsWith('/auth/refresh') ? respuesta(401) : noAutenticado(),
    );
    const oyente = vi.fn();
    const quitar = alTerminarSesion(oyente);
    await expect(api('/emprendimientos')).rejects.toBeInstanceOf(ErrorApi);
    expect(oyente).toHaveBeenCalledOnce();
    quitar();
  });

  it('debería traducir los errores de la API con su código y detalle', async () => {
    fetchFalso.mockResolvedValue(
      respuesta(409, { error: { code: 'LIMITE_EMPRENDIMIENTOS', message: 'Máximo', details: [] } }),
    );
    await expect(api('/emprendimientos', { method: 'POST', body: {} })).rejects.toMatchObject({
      code: 'LIMITE_EMPRENDIMIENTOS',
      status: 409,
    });
  });

  it('debería enviar el Idempotency-Key cuando se indica', async () => {
    fetchFalso.mockResolvedValue(respuesta(201, {}));
    await api('/movimientos', { method: 'POST', body: {}, idempotencyKey: 'clave-1' });
    const init = fetchFalso.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toBe('clave-1');
  });
});
