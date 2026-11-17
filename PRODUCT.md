# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Trabajadores autónomos de Argentina: peluqueros, tatuadores, masajistas, profesores particulares y
dueños de locales o emprendimientos chicos. Usan el teléfono y la computadora por igual: anotan en el
teléfono durante el día (entre un cliente y otro, al terminar una clase) y revisan en la computadora
(el mes, los cobros, las estadísticas).

## Product Purpose

Organizar turnos, clases o pedidos y saber cuánto entra y cuánto sale del emprendimiento cada mes, sin
planillas ni cuentas a mano. Gratis, en español rioplatense y en pesos argentinos. El éxito es que el
autónomo deje el cuaderno de papel y no lo extrañe.

## Positioning

Es el cuaderno de trabajo que el autónomo ya conoce, pero que hace solo las cuentas. Un mismo usuario
puede tener varios emprendimientos de tipos distintos (Turnero, Calendario de clases, Ventas), cada uno
con sus pestañas propias y con movimientos y estadísticas en común.

## Operating Context

- Turnero: agenda con horarios, bloqueos, clientes, cobros e insumos.
- Calendario de clases: clases individuales o grupales, alumnos y pagos por mes.
- Ventas: anotaciones de pedidos o tareas con estados.
- Todos: movimientos (ingresos y gastos) y estadísticas mensuales.
- Cuenta de demostración con los tres tipos cargados; banner de demo mientras dura.

## Capabilities and Constraints

- SPA en React 19 + Vite + Tailwind 4 (`apps/web`), FullCalendar para agenda y calendario, Recharts para
  estadísticas. API NestJS en `apps/api`.
- Pruebas de punta a punta con Playwright (`e2e/`) que buscan por rol, texto y etiqueta: el rediseño no
  puede cambiar textos, roles ni etiquetas accesibles sin actualizar las pruebas.
- Montos en pesos con cifras tabulares.

## Brand Commitments

- Nombre: AutoNota.
- La idea de **cuaderno de trabajo** es un compromiso de marca confirmado por el dueño: el rediseño la
  conserva como metáfora, aunque puede cambiar cómo se representa.
- Paleta fijada por el dueño: predomina el blanco, con negro y una escala de marrones. Verde y rojo solo
  donde significan algo (entra o sale dinero, errores). Nada de azul ni de colores llamativos.
- Voz: español rioplatense, con voseo, directa y amable ("¿Querés verlo antes?").

## Evidence on Hand

- Demo publicada en https://autonota-two.vercel.app con datos de ejemplo.
- No hay testimonios, clientes ni cifras de uso reales: no se inventan.

## Product Principles

1. Anotar tiene que ser tan rápido como escribir en papel.
2. Las cuentas se ven siempre, sin buscarlas.
3. Familiar antes que ingenioso: el autónomo no tiene tiempo de aprender una herramienta.
4. Estados por forma y no solo por color.

## Accessibility & Inclusion

Legibilidad alta (la tipografía actual, Atkinson Hyperlegible, se eligió por eso), objetivos táctiles de
44 px como mínimo, foco visible y estados que no dependen solo del color.
