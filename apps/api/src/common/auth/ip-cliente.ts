import type { Request } from 'express';

/**
 * Cadena de proxies en producción, medida en la fase 3 (ADR-010):
 *   visitante → Vercel → Cloudflare → balanceador de Render → proxy local → API
 * Con trust proxy en 3 saltos, req.ip es quien se conectó a Cloudflare: el visitante
 * si llama directo a Render, o un servidor de Vercel si llega por el rewrite de la SPA.
 */
export const SALTOS_PROXY_PRODUCCION = 3;

function primerValor(valor: string | string[] | undefined): string | undefined {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  const ip = texto?.split(',')[0]?.trim();
  return ip ? ip : undefined;
}

/**
 * IP real del visitante para el límite de intentos (Parte 4, sección 4).
 * Vercel reenvía sin cambios el X-Forwarded-For que manda el visitante (se puede falsificar),
 * pero agrega x-vercel-forwarded-for con la IP real. Si la petición no viene de Vercel, se usa req.ip.
 */
export function obtenerIpCliente(req: Pick<Request, 'ip' | 'headers'>): string {
  if (req.headers['x-vercel-id']) {
    const deVercel = primerValor(req.headers['x-vercel-forwarded-for']);
    if (deVercel) return deVercel;
  }
  return req.ip ?? 'desconocida';
}
