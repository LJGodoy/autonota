// Cliente HTTP único (Parte 6, sección 5.2): agrega el access token, renueva la sesión ante un 401
// con un solo refresh a la vez (CU-02) y traduce los códigos de error a mensajes en español.
import {
  CODIGOS_ERROR,
  MENSAJE_ERROR,
  type CodigoError,
  type DetalleError,
} from '@autonota/shared';

const BASE = '/api/v1';
/** Tiempo a partir del cual se avisa que el servidor está arrancando (ADR-010) */
const DEMORA_LENTA_MS = 4000;

/** Access token solo en memoria, nunca en localStorage ni sessionStorage (ADR-006) */
let accessToken: string | null = null;
let refrescoEnCurso: Promise<string | null> | null = null;
let pendientesLentas = 0;
const oyentesSesionTerminada = new Set<() => void>();
const oyentesDemora = new Set<(lento: boolean) => void>();

export class ErrorApi extends Error {
  constructor(
    readonly code: CodigoError,
    message: string,
    readonly status: number,
    readonly details: DetalleError[] = [],
  ) {
    super(message);
  }
}

export function establecerAccessToken(token: string | null): void {
  accessToken = token;
}

export function alTerminarSesion(oyente: () => void): () => void {
  oyentesSesionTerminada.add(oyente);
  return () => oyentesSesionTerminada.delete(oyente);
}

export function alCambiarDemora(oyente: (lento: boolean) => void): () => void {
  oyentesDemora.add(oyente);
  return () => oyentesDemora.delete(oyente);
}

function esCodigo(valor: unknown): valor is CodigoError {
  return typeof valor === 'string' && (CODIGOS_ERROR as readonly string[]).includes(valor);
}

async function aError(res: Response): Promise<ErrorApi> {
  let cuerpo: unknown = null;
  try {
    cuerpo = await res.json();
  } catch {
    /* sin cuerpo JSON */
  }
  const error = (
    cuerpo as { error?: { code?: unknown; message?: unknown; details?: unknown } } | null
  )?.error;
  const code: CodigoError = esCodigo(error?.code)
    ? error.code
    : res.status >= 500
      ? 'ERROR_INTERNO'
      : 'VALIDACION';
  const message = typeof error?.message === 'string' ? error.message : MENSAJE_ERROR[code];
  const details = Array.isArray(error?.details) ? (error.details as DetalleError[]) : [];
  return new ErrorApi(code, message, res.status, details);
}

/** fetch con aviso de servidor lento y traducción de errores de red */
async function pedir(url: string, init: RequestInit): Promise<Response> {
  let avisado = false;
  const temporizador = setTimeout(() => {
    avisado = true;
    pendientesLentas += 1;
    if (pendientesLentas === 1) oyentesDemora.forEach((o) => o(true));
  }, DEMORA_LENTA_MS);
  try {
    return await fetch(url, { credentials: 'same-origin', ...init });
  } catch {
    throw new ErrorApi(
      'ERROR_INTERNO',
      'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.',
      0,
    );
  } finally {
    clearTimeout(temporizador);
    if (avisado) {
      pendientesLentas -= 1;
      if (pendientesLentas === 0) oyentesDemora.forEach((o) => o(false));
    }
  }
}

/**
 * CU-02: renueva la sesión con la cookie refresh_token. Si varias peticiones fallan a la vez,
 * se hace un solo refresh y las demás esperan su resultado.
 */
export function refrescarSesion(): Promise<string | null> {
  refrescoEnCurso ??= (async () => {
    try {
      const res = await pedir(`${BASE}/auth/refresh`, { method: 'POST' });
      if (!res.ok) {
        accessToken = null;
        return null;
      }
      const datos = (await res.json()) as { accessToken: string };
      accessToken = datos.accessToken;
      return accessToken;
    } catch {
      accessToken = null;
      return null;
    } finally {
      refrescoEnCurso = null;
    }
  })();
  return refrescoEnCurso;
}

export interface OpcionesPeticion {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Idempotency-Key de los formularios que registran dinero (RF-07) */
  idempotencyKey?: string;
}

export async function api<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
  const ejecutar = () => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (opciones.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (opciones.idempotencyKey) headers['Idempotency-Key'] = opciones.idempotencyKey;
    return pedir(`${BASE}${ruta}`, {
      method: opciones.method ?? 'GET',
      headers,
      body: opciones.body === undefined ? undefined : JSON.stringify(opciones.body),
    });
  };

  let res = await ejecutar();
  const esRutaDeSesion =
    ruta.startsWith('/auth/') && ruta !== '/auth/me' && ruta !== '/auth/cuenta';
  if (res.status === 401 && !esRutaDeSesion) {
    const error = await aError(res.clone());
    if (error.code === 'NO_AUTENTICADO') {
      const token = await refrescarSesion();
      if (!token) {
        oyentesSesionTerminada.forEach((o) => o());
        throw error;
      }
      res = await ejecutar(); // se repite una sola vez
    }
  }
  if (!res.ok) throw await aError(res);
  if (res.status === 204 || res.status === 202) return undefined as T;
  return (await res.json()) as T;
}
