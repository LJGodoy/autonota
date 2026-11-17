# Surface: AutoNota web (apps/web, all screens)

Scope: the whole SPA. Mode **Operate** for every screen behind sign-in; the landing (`/`) is the one
Persuade surface but shares the world and stays restrained.

Audience and job: self-employed workers jotting things down on the phone during the day and reviewing on
the computer. Task first: agenda, calendar, notes, transactions, monthly stats.

Constraints: the e2e tests look things up by role, text and label, so no visible copy or accessible name
changes. States keep being told apart by shape (filled, dotted, struck through), not only by colour.

## Direction contract

THESIS: A clean work notebook (white paper, dark ink, browns) that does the sums. It refuses the
generic grey SaaS panel and the cream-and-kraft rustic notebook.

OWN-WORLD (pinned by the owner after rejecting the first rendition): white predominant, black for text,
a brown scale for actions, headings and the top bar (one brown per business type). Green for income, red
for expenses and errors. Light brown margin line, a marker pass in light brown on the active item. No
graph paper and no blue. Kalam for headings, Atkinson Hyperlegible for everything else.

STORY: The user recognises their notebook, finds their business by the cover colour, writes things down
and sees the totals without asking for them.

FIRST VIEWPORT: Top bar in the business's brown with logo and navigation; underneath, the name
handwritten in dark brown, the type label and the tabs; the active tab with a light brown marker pass.
Then the work area on white.

FORM: Owner-pinned palette over the notebook structure. seed: none (pinned): "que tenga como
predominante el color blanco, negro y una escala de marrones".

Signature: the light brown marker pass (active tab, today) and the total at the foot with a double line.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
