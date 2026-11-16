# AutoNota

Sistema web gratuito, en español y en pesos argentinos, para que trabajadores autónomos organicen
turnos, clases o tareas y registren ingresos y gastos. Se ve como un cuaderno de trabajo escrito a lápiz.

La especificación completa está en el documento de diseño (SDD v1.2). Este repositorio implementa
las **fases 1 y 2**: base del proyecto, cuenta, sesión, emprendimientos y cuentas de demostración.

| Fase | Contenido                                                                   | Estado                       |
| ---- | --------------------------------------------------------------------------- | ---------------------------- |
| 1    | Monorepo, tooling, esquema y migración, base de API y SPA, identidad visual | Hecha                        |
| 2    | Cuenta, sesión, emprendimientos, demo (RF-01 a RF-06, RF-08, RF-09)         | Hecha                        |
| 3    | Publicación en Vercel, Render y Neon                                        | Pendiente (requiere cuentas) |
| 4-7  | Movimientos y estadísticas, turnero, clases, ventas                         | Pendientes                   |
| 8    | Playwright contra el entorno publicado, cierre                              | Pendiente                    |

## Requisitos

- Node.js 22 LTS y pnpm 9 (`npm install -g pnpm@9`)
- Docker Desktop (para PostgreSQL 16)

## Levantar el entorno local

```bash
pnpm install
cp .env.example apps/api/.env   # completar JWT_ACCESS_SECRET (32+ caracteres)
pnpm dev
```

`pnpm dev` levanta PostgreSQL en Docker, aplica las migraciones y arranca la API (http://localhost:3000)
y la SPA (http://localhost:5173) con recarga en caliente. La SPA llama siempre a rutas relativas
`/api/v1`; en local las reenvía el proxy de Vite y en producción el rewrite de Vercel (`apps/web/vercel.json`).

Alternativa con todo en contenedores (API y base): `docker compose up --build`.

- Documentación de la API (Swagger): http://localhost:3000/api/docs
- Datos de ejemplo locales: `pnpm seed` crea `ejemplo@autonota.local` / `Ejemplo2026` con un emprendimiento de cada tipo.
- Sin credenciales de Gmail, el mail de recuperación de contraseña se escribe en el log de la API.

## Comandos

| Comando                 | Qué hace                                                                    |
| ----------------------- | --------------------------------------------------------------------------- |
| `pnpm verify`           | Tipos, ESLint, pruebas unitarias, de integración y build (antes de cada PR) |
| `pnpm test`             | Pruebas unitarias (Jest en la API, Vitest en la SPA y en shared)            |
| `pnpm test:integration` | Endpoints contra PostgreSQL real (base `autonota_test`, requiere Docker)    |
| `pnpm format`           | Prettier sobre todo el repositorio                                          |

Los commits siguen Conventional Commits (`feat(turnero): ...`), validados por commitlint; Husky corre
Prettier y ESLint sobre los archivos modificados antes de cada commit.

## Estructura

```
apps/api          API REST en NestJS (módulos auth, emprendimientos; código común en src/common)
apps/api/prisma   Esquema Prisma y migraciones (la inicial es el script SQL del SDD, Parte 3)
apps/web          SPA en React (features/, components/, lib/, routes/)
packages/shared   Esquemas Zod y tipos compartidos entre la SPA y la API (ADR-012)
```

## Versiones fijadas

Fijadas en `pnpm-lock.yaml`: Node.js 22, pnpm 9.15, TypeScript 5.7.3, React 19.3.1, Vite 6.4.6,
React Router 7.18.5, TanStack Query 5.107.1, React Hook Form 7.92.0, Tailwind CSS 4.3.5,
NestJS 11.2.10, Prisma 6.19.3, Zod 3.25.76, nestjs-zod 5.6.0, PostgreSQL 16, Jest 29.7.0,
Vitest 3.2.7, Sentry 9.47.2.

## Supuestos de las fases 1 y 2

Decisiones tomadas donde el SDD no fijaba el detalle (criterio de la Parte 1, sección 9):

1. **nestjs-zod 5 y Zod 3.25.** La versión 4 de nestjs-zod no funciona con `@nestjs/swagger` 11; la 5 exige Zod ≥ 3.25 (misma API que 3.24). Sentry 9, porque Sentry 8 no soporta NestJS 11. Corresponde a la regla de la Parte 2, sección 6.
2. **Gmail opcional fuera de producción.** En desarrollo y pruebas, si faltan las credenciales, el mail se escribe en el log. En producción la API no arranca sin ellas.
3. **Cookie `Secure` solo en producción**, para que funcione en `http://localhost`. En producción es httpOnly, Secure, SameSite=Lax, Path=/api/v1/auth.
4. **Trust proxy de 2 saltos en producción** (Vercel y el balanceador de Render) para tomar la IP real de X-Forwarded-For; 1 salto en local. Verificarlo en la fase 3.
5. **Cuentas de demostración:** no tienen contraseña conocida, no pueden iniciar sesión con contraseña ni recuperarla, y pueden eliminarse sin pedir contraseña (DELETE /auth/cuenta ignora la contraseña para ellas).
6. **El usuario de la API incluye `esDemo` y `expiraEn`** (amplía el contrato de la Parte 4) para que la SPA avise cuándo se borra la demo.
7. **Las pruebas de integración no borran la base de pruebas**: aplican las migraciones pendientes con `prisma migrate deploy` y cada prueba crea sus propios datos.
8. **Textos legales en borrador**, marcados en pantalla como pendientes de revisión legal (SDD 0.7).
