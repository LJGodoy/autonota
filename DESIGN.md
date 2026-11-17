# AutoNota design system

A work notebook in white, black and a brown scale. Green and red only where they mean something.
The tokens live in `apps/web/src/index.css` (`@theme`); change them there and only ## Color

Owner-pinned palette: **white predominant, black and a brown scale**; green and red only where they carry
meaning (money in, money out, errors). No blue and no graph paper.

| Token                                          | Value                             | Use                                                     |
| ---------------------------------------------- | --------------------------------- | ------------------------------------------------------- |
| `hoja`                                         | `#ffffff`                         | Page and card background (the dominant colour)          |
| `arena`                                        | `#f5f1ec`                         | Second layer: hover, table headers, notes, active field |
| `tinta`                                        | `#161311`                         | Main text, control borders                              |
| `lapiz`                                        | `#5e554d`                         | Secondary text, labels                                  |
| `linea` / `cuadricula`                         | `#d6cdc2` / `#ece6de`             | Container lines / row separators                        |
| `cafe` / `cafe-oscuro`                         | `#4a3324` / `#2c1e15`             | Primary action, links, headings                         |
| `madera` / `tostado`                           | `#8a6446` / `#c4a383`             | Brown accents                                           |
| `verde`                                        | `#1d6b3f`                         | Income: amounts and bars                                |
| `rojo`                                         | `#b42318`                         | Expenses, errors, "absent", "unpaid"                    |
| `margen` / `resaltador`                        | `#e3d3c1` / `#ecdcc8`             | Margin line and marker pass (decorative only)           |
| `tapa-general`                                 | `#161311`                         | Top bar with no business open                           |
| `tapa-turnero` / `tapa-clases` / `tapa-ventas` | `#3b281c` / `#4f3a2a` / `#634632` | Top bar for each business type: three browns            |

`bg-tapa` reads `--tapa-actual`; `LayoutEmprendimiento` sets `data-tapa` on `<html>` while a business is
open. Light mode only.

puter.

## Type

- **Kalam** (handwriting), only for headings (`font-mano`): h1 `text-4xl`/`text-5xl`, h2 `text-3xl`,
  h3 `text-2xl`, and the total at the foot. Never on labels, buttons or data.
- **Atkinson Hyperlegible** for everything else (a legibility commitment). Amounts in `montos` (tabular).

## Shape and depth

- `rounded-trazo` 6 px (controls), `rounded-trazo-2` 10 px (sheets and dialogs).
- Thin 1 px lines; 2 px only on the field underline and the checkbox.
- `shadow-nota`: soft paper shadow (offset + blur). No hard offset shadows.

## Components

- **Boton**: `primario` filled with brown; `secundario` with a `linea` border and `arena` hover;
  `peligro` red outline that fills on hover; `texto` underlined link.
- **Campo / select / textarea**: written on the line (2 px bottom border). Hover and focus go brown,
  and focus also gets an `arena` background (global rule in `index.css`). Error: red dashed line.
- **Tarjeta**: loose sheet (`hoja` + `linea` + shadow); `nota` = `arena` without a border. Never nest cards.
- **Tabs** for a business: plain text; the active one gets a `resaltado` pass.
- **Labels**: shape-based states (filled ✓ done, red dotted absent, struck-through cancelled).
  `EtiquetaTipo` carries a small square in the cover colour.
- **Mini notebook cover**: the coloured cover with a white label, identifying each business (list and landing).

## Signature moves

1. **`.resaltado`**: a Marker pass with slightly crooked edges. Only for the active state, today and selection.
2. **`.total-al-pie`**: the hand-done sum, with a double line underneath (`ListaMovimientos` with `cuenta`,
   balance in Estadísticas, total of the period in the table).
3. **`.fondo-cuaderno`**: white sheet with a light brown margin line, only on lists and empty states.

## Motion

150 ms ease-out on colour and border; the cover changes colour in 300 ms. No entrance choreography.
