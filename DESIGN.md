# AutoNota design system

The Argentine school notebook (graph paper, ballpoint, highlighter) used as a work tool.
The tokens live in `apps/web/src/index.css` (`@theme`); change them there and only there.

## Color

Strategy: **Restrained with a committed shell**. White sheet plus ballpoint ink; the colour that carries the
surface is the notebook cover (top bar), which changes with the business that is open.

| Token                                          | Value                             | Use                                                                 |
| ---------------------------------------------- | --------------------------------- | ------------------------------------------------------------------- |
| `hoja`                                         | `#fcfdff`                         | Page and card background                                            |
| `celeste`                                      | `#edf2fa`                         | Second layer: hover, table headers, notes, active field             |
| `tinta`                                        | `#1b2136`                         | Main text, control borders                                          |
| `lapiz`                                        | `#4b5470`                         | Secondary text, labels (≥ 7:1 on `hoja`)                            |
| `linea`                                        | `#bcc8dc`                         | Container lines and secondary buttons                               |
| `cuadricula`                                   | `#dbe5f4`                         | Graph-paper grid and row separators (decorative only)               |
| `birome` / `birome-oscura`                     | `#2539b0` / `#1a2a85`             | Primary action, links, handwritten headings, income                 |
| `rojo`                                         | `#b42318`                         | Errors, expenses, "absent", "unpaid"                                |
| `margen`                                       | `#ec8a8f`                         | Red margin line (decorative only)                                   |
| `resaltador`                                   | `#fff06e`                         | Active tab, today, selection, demo banner; always with `tinta` text |
| `tapa-general`                                 | `#23284a`                         | Account cover (no business open)                                    |
| `tapa-turnero` / `tapa-clases` / `tapa-ventas` | `#a3262c` / `#1d6447` / `#1f4b96` | Cover for each business type                                        |

`bg-tapa` reads `--tapa-actual`; `LayoutEmprendimiento` sets `data-tapa` on `<html>` while a business is
open. Light mode only: the notebook is paper, used by day at the job and at night on the computer.

## Type

- **Kalam** (ballpoint handwriting), only for headings (`font-mano`): h1 `text-4xl`/`text-5xl`, h2 `text-3xl`,
  h3 `text-2xl`, and the total at the foot. Never on labels, buttons or data.
- **Atkinson Hyperlegible** for everything else (a legibility commitment). Amounts in `montos` (tabular).

## Shape and depth

- `rounded-trazo` 6 px (controls), `rounded-trazo-2` 10 px (sheets and dialogs).
- Thin 1 px ballpoint lines; 2 px only on the field underline and the checkbox.
- `shadow-nota`: soft paper shadow (offset + blur). No hard offset shadows.

## Components

- **Boton**: `primario` filled with ballpoint ink; `secundario` with a `linea` border and `celeste` hover;
  `peligro` red outline that fills on hover; `texto` underlined link.
- **Campo / select / textarea**: written on the line (2 px bottom border). Hover and focus go ballpoint
  blue, and focus also gets a `celeste` background (global rule in `index.css`). Error: red dashed line.
- **Tarjeta**: loose sheet (`hoja` + `linea` + shadow); `nota` = `celeste` without a border. Never nest cards.
- **Tabs** for a business: plain text; the active one gets a `resaltado` pass.
- **Labels**: shape-based states (filled ✓ done, red dotted absent, struck-through cancelled).
  `EtiquetaTipo` carries a small square in the cover colour.
- **Mini notebook cover**: the coloured cover with a white label, identifying each business (list and landing).

## Signature moves

1. **`.resaltado`**: a highlighter swipe with slightly crooked edges. Only for the active state, today and selection.
2. **`.total-al-pie`**: the hand-done sum, with a double line underneath (`ListaMovimientos` with `cuenta`,
   balance in Estadísticas, total of the period in the table).
3. **`.fondo-cuaderno`**: 5 mm graph paper with a red margin line, only on work areas (lists, empty states).

## Motion

150 ms ease-out on colour and border; the cover changes colour in 300 ms. No entrance choreography.
