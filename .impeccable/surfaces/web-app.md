# Surface: AutoNota web (apps/web, all screens)

Scope: the whole SPA. Mode **Operate** for every screen behind sign-in; the landing (`/`) is the one
Persuade surface but shares the world and stays restrained.

Audience and job: self-employed workers jotting things down on the phone during the day and reviewing on
the computer. Task first: agenda, calendar, notes, transactions, monthly stats.

Constraints: the e2e tests look things up by role, text and label, so no visible copy or accessible name
changes. States keep being told apart by shape (filled, dotted, struck through), not only by colour.

## Direction contract

THESIS: The Argentine school notebook (graph paper, ballpoint, highlighter) as a work tool. It refuses the
generic grey SaaS panel and the cream-and-kraft rustic notebook.

OWN-WORLD: Bright white sheet with a light blue 5 mm grid (only on work areas), Bic-blue ballpoint ink for
actions, handwritten headings and income, red margin line on lists, notebook-red for errors and expenses.
Each business has its own cover colour: Turnero red, Clases green, Ventas blue. Thin 1px ballpoint lines,
small corners, soft paper shadows. Kalam (ballpoint handwriting) only for headings; Atkinson Hyperlegible
for everything else.

STORY: The user recognises their notebook, finds their business by the cover colour, writes things down
and sees the totals without asking for them.

FIRST VIEWPORT: Top bar in the business's cover colour with logo and navigation; underneath, the name
handwritten in ballpoint, the type label and the tabs; the active tab marked with a highlighter. Then the
work area on graph paper.

FORM: Graph paper and ballpoint, option 1 of 3 presented. seed: none (unavailable): `concept-seed` did not
run because the engine was not installed.

Signature: the yellow highlighter swipe (active tab, today, selection) and the total at the foot with a
double line.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
