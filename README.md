# AutoNota

Sistema web gratuito, en español y en pesos argentinos, para que trabajadores autónomos organicen
turnos, clases o tareas y registren ingresos y gastos. Se ve como un cuaderno de trabajo escrito a lápiz.

La especificación completa está en el documento de diseño (SDD v1.2). Este repositorio implementa
la **primera versión completa** (fases 1 a 8): cuenta y emprendimientos, turnero, calendario de
clases, ventas con anotaciones, movimientos y estadísticas, publicada y probada de punta a punta.

**Demo publicada:** https://autonota-two.vercel.app (API: https://autonota-api.onrender.com/api/docs)

| Fase | Contenido                                                                   | Estado |
| ---- | --------------------------------------------------------------------------- | ------ |
| 1    | Monorepo, tooling, esquema y migración, base de API y SPA, identidad visual | Hecha  |
| 2    | Cuenta, sesión, emprendimientos, demo (RF-01 a RF-06, RF-08, RF-09)         | Hecha  |
| 3    | Publicación en Vercel, Render y Neon                                        | Hecha  |
| 4    | Movimientos y estadísticas (RF-07, RF-70 a RF-73, RNF-04, CU-12)            | Hecha  |
| 5    | Turnero (RF-10 a RF-21; CU-06, 07, 08, 13, 16, 18)                          | Hecha  |
| 6    | Calendario de clases (RF-30 a RF-38; CU-09, 10, 14, 18)                     | Hecha  |
| 7    | Ventas y anotaciones (RF-50 a RF-56; CU-11)                                 | Hecha  |
| 8    | Playwright contra el entorno publicado, cierre                              | Hecha  |

## Entorno publicado (ADR-010)

| Pieza   | Servicio                                                           | Notas                                    |
| ------- | ------------------------------------------------------------------ | ---------------------------------------- |
| SPA     | Vercel (`apps/web`, preset Vite)                                   | `vercel.json` reenvía `/api/*` a Render  |
| API     | Render (Docker, `apps/api/Dockerfile`, región Ohio, plan gratuito) | Aplica las migraciones al arrancar       |
| Base    | Neon (PostgreSQL 16, conexión directa sin pooling)                 | Región AWS US East (Ohio)                |
| Mails   | API de Gmail con OAuth (ADR-011)                                   | Los mails pueden llegar a spam (SDD 0.7) |
| Errores | Sentry, un proyecto para la API y otro para la SPA                 |                                          |
| Ping    | cron-job.org cada 10 minutos a `/api/v1/health`                    | Evita que Render suspenda la API         |

Las variables de entorno se cargan en los paneles de Render (API) y Vercel (`VITE_SENTRY_DSN`),
nunca en el repositorio. Cada push a `main` publica automáticamente en los dos servicios.

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

| Comando                 | Qué hace                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `pnpm verify`           | Tipos, ESLint, pruebas unitarias, de integración y build (antes de cada PR)         |
| `pnpm test`             | Pruebas unitarias (Jest en la API, Vitest en la SPA y en shared)                    |
| `pnpm test:integration` | Endpoints contra PostgreSQL real (base `autonota_test`, requiere Docker)            |
| `pnpm format`           | Prettier sobre todo el repositorio                                                  |
| `pnpm e2e`              | Playwright: flujos críticos CU-01, 02, 06, 08, 09, 10 y 15 contra la demo publicada |

Para las pruebas de punta a punta, instalar una vez el navegador con
`pnpm --filter @autonota/e2e instalar-navegador`. Por defecto corren contra
https://autonota-two.vercel.app; para otra URL, `E2E_URL=http://localhost:5173 pnpm e2e`.
Crean una cuenta de demostración (hay un límite de 3 por hora por IP) y una cuenta propia que
eliminan al terminar.

Los commits siguen Conventional Commits (`feat(turnero): ...`), validados por commitlint; Husky corre
Prettier y ESLint sobre los archivos modificados antes de cada commit.

## Estructura

```
apps/api          API REST en NestJS: módulos auth, emprendimientos, movimientos, estadisticas,
                  turnero, clases y ventas (ADR-005); código común en src/common
apps/api/prisma   Esquema Prisma y migraciones (la inicial es el script SQL del SDD, Parte 3)
apps/web          SPA en React (features/, components/, lib/, routes/)
packages/shared   Esquemas Zod y tipos compartidos entre la SPA y la API (ADR-012)
e2e               Pruebas de punta a punta con Playwright (Parte 6, sección 7)
```

## Versiones fijadas

Fijadas en `pnpm-lock.yaml`: Node.js 22, pnpm 9.15, TypeScript 5.7.3, React 19.3.1, Vite 6.4.6,
React Router 7.18.5, TanStack Query 5.107.1, React Hook Form 7.92.0, Tailwind CSS 4.3.5,
NestJS 11.2.10, Prisma 6.19.3, Zod 3.25.76, nestjs-zod 5.6.0, PostgreSQL 16, Jest 29.7.0,
Vitest 3.2.7, Sentry 9.47.2, Recharts 3.10, FullCalendar 6.1, Playwright 1.

## Supuestos de las fases 1 y 2

Decisiones tomadas donde el SDD no fijaba el detalle (criterio de la Parte 1, sección 9):

1. **nestjs-zod 5 y Zod 3.25.** La versión 4 de nestjs-zod no funciona con `@nestjs/swagger` 11; la 5 exige Zod ≥ 3.25 (misma API que 3.24). Sentry 9, porque Sentry 8 no soporta NestJS 11. Corresponde a la regla de la Parte 2, sección 6.
2. **Gmail opcional fuera de producción.** En desarrollo y pruebas, si faltan las credenciales, el mail se escribe en el log. En producción la API no arranca sin ellas.
3. **Cookie `Secure` solo en producción**, para que funcione en `http://localhost`. En producción es httpOnly, Secure, SameSite=Lax, Path=/api/v1/auth.
4. **IP real del visitante (verificado en la fase 3).** La cadena medida es visitante → Vercel → Cloudflare → balanceador de Render → proxy local → API. La API confía en 3 saltos en producción (1 en local). Vercel reenvía sin cambios el `X-Forwarded-For` del visitante, que se puede falsificar, así que el límite de intentos usa `x-vercel-forwarded-for` cuando la petición trae `x-vercel-id` (`common/auth/ip-cliente.ts`). Riesgo conocido: quien llame directo a Render puede inventar esos dos encabezados; cerrarlo requiere un secreto compartido entre Vercel y Render.
5. **Cuentas de demostración:** no tienen contraseña conocida, no pueden iniciar sesión con contraseña ni recuperarla, y pueden eliminarse sin pedir contraseña (DELETE /auth/cuenta ignora la contraseña para ellas).
6. **El usuario de la API incluye `esDemo` y `expiraEn`** (amplía el contrato de la Parte 4) para que la SPA avise cuándo se borra la demo.
7. **Las pruebas de integración no borran la base de pruebas**: aplican las migraciones pendientes con `prisma migrate deploy` y cada prueba crea sus propios datos.
8. **Textos legales en borrador**, marcados en pantalla como pendientes de revisión legal (SDD 0.7).

## Supuestos de la fase 4

1. **Módulo `movimientos` propio en la API.** El ADR-005 no lo lista, pero `/movimientos` es común a los tres tipos de negocio (Parte 4, sección 9). Los módulos turnero, clases y ventas lo van a usar a través de `MovimientosService`.
2. **Idempotency-Key:** si la clave ya se usó en el mismo emprendimiento, la API responde 201 con el registro existente. Si se usó en otro emprendimiento, responde 400 `VALIDACION`.
3. **`alumnoId` fuera de un calendario de clases o `tareaId` fuera de ventas** responde 409 `TIPO_INCOMPATIBLE`.
4. **Filtro por mes del listado:** usa la condición equivalente a `mes_imputacion` (el mes correspondiente o el mes de la fecha), porque Prisma no modela la columna calculada. Las estadísticas sí consultan la columna y su índice.
5. **Recharts 3**, porque el SDD no fija la versión y la 2 está deprecada.
6. **Colores del gráfico:** café para ingresos y madera con rayado diagonal para gastos. Se distinguen con todo tipo de daltonismo, pero por diseño no alcanzan la saturación que pide el validador de paletas; la identidad del SDD es monocromática.
7. **Pagos de alumnos y ventas vinculadas:** en un calendario de clases, «+ Pago» pide alumno y mes; la venta vinculada a una tarea se carga desde el detalle de la anotación.
8. **El listado del mes muestra hasta 100 movimientos** y avisa si hay más.

## Supuestos de las fases 5 a 8

1. **Hora de Argentina fija en UTC-3** en la interfaz: Argentina no tiene horario de verano desde 2009. FullCalendar trabaja en "UTC" con la hora de Argentina (`apps/web/src/lib/zona.ts`), así la agenda no depende de la zona horaria del navegador. La API sí usa la zona `America/Argentina/Buenos_Aires`.
2. **Un turno que pasa la medianoche** queda fuera de horario, aunque las franjas de los dos días sean contiguas.
3. **Turnos afectados (CU-16):** se consideran los PROGRAMADOS desde el comienzo del día de hoy en Argentina. El detalle del 409 trae un renglón legible por turno (`vie 20/11 10:00 · Ana Gómez`) con el id del turno en `field`.
4. **Realizar con cobro:** si la `Idempotency-Key` ya existe, el turno se marca realizado igual pero no se crea otro cobro.
5. **Copiar semana:** responde `{ creados, omitidos }` (turnos) y `{ creadas, omitidas }` (clases) con los registros creados completos, y cada omitido con su motivo: `CLIENTE_INACTIVO`, `FUERA_DE_HORARIO`, `EN_BLOQUEO`, `TURNO_MISMO_INICIO` o `SIN_ALUMNOS`. `semanaOrigen` debe ser un lunes.
6. **Clientes y alumnos comparten servicio** (`common/personas`), con nombre anónimo distinto. Al anonimizar también se dan de baja. Se puede reactivar con `PATCH { activo: true }`.
7. **Cancelar una clase ya cancelada** responde 409 `ESTADO_INVALIDO`, igual que un turno.
8. **Tareas:** el orden por prioridad pone ALTA primero y, a igual prioridad, las más nuevas. El detalle trae `totalVendidoCentavos`. En el tablero, la casilla alterna entre Pendiente y Realizada; el selector permite cualquier estado.
9. **Pruebas de punta a punta:** comparten una cuenta de demostración por el límite de 3 demos por hora por IP, y crean una cuenta propia para CU-01 y CU-02 que eliminan al terminar.
