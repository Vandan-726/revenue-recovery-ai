# Recoverly Design System

## 1. Product and visual direction

Recoverly is a revenue-recovery operations console for teams monitoring failed payments, recovery attempts, provider health, and retained revenue. The interface should feel operational, trustworthy, data-dense, and calm under pressure.

**Design direction:** editorial operations console with a dark command sidebar, warm neutral workspace, compact data typography, and one distinctive signal color. The visual language should make financial metrics immediately scannable without looking like a generic fintech template.

**Signature element:** the acid-yellow active state against the deep ink sidebar. Use it sparingly for the current navigation item, live state, and the most important positive signal.

**Principles:**

- Prefer evidence over decoration: every chart, badge, icon, and number should explain an operational state.
- Make money and status scannable: use tabular numerals, consistent currency formatting, and strong hierarchy.
- Keep the workspace quiet: warm background, restrained borders, and cards with minimal shadow.
- Use motion only to explain loading, arrival, or change in state.
- Never use gradients, glassmorphism, decorative blobs, or ungrounded “AI” decoration.
- Preserve the existing 3–5 color system and avoid introducing one-off colors.

## 2. Current implementation baseline

The dashboard is a Vite + React + TypeScript application using Tailwind CSS v4, `tw-animate-css`, Radix primitives, Lucide icons, Recharts, Wouter, and TanStack Query. The shared shell is in `src/components/app-shell.tsx`; reusable visual primitives are in `src/components/ui-kit.tsx`; global tokens and CSS utilities are in `src/index.css`.

Primary routes:

- `/dashboard` — operational overview, KPI cards, revenue velocity, exposure, live queue
- `/recoveries` — searchable and sortable recovery ledger
- `/recoveries/:id` — recovery detail and next actions
- `/analytics` — strategy scorecard, customer concentration, operating costs
- `/settings` — account, recovery configuration, integrations, danger zone

The UI is API-backed through generated hooks in `@workspace/api-client-react`. Loading, error, empty, refresh, export, and toast states are part of the product experience and should remain visually consistent.

## 3. Color tokens

Use semantic tokens rather than direct Tailwind colors in product UI. These values match the current implementation in `src/index.css`.

| Token | HSL | Role |
|---|---:|---|
| `background` | `42 35% 96%` | Warm workspace canvas |
| `foreground` | `221 34% 15%` | Primary ink and headings |
| `card` | `42 40% 99%` | Elevated surfaces |
| `card-border` | `38 25% 88%` | Card and panel outline |
| `border` | `38 25% 87%` | Dividers and controls |
| `muted` | `40 22% 92%` | Secondary fills and tracks |
| `muted-foreground` | `220 12% 47%` | Supporting text |
| `primary` | `165 73% 34%` | Teal action, recovery, positive state |
| `primary-foreground` | `42 40% 99%` | Text on teal |
| `accent` | `59 84% 62%` | Signature yellow signal and active nav |
| `accent-foreground` | `221 34% 15%` | Text on yellow |
| `destructive` | `3 68% 48%` | Failed, destructive, pause/delete states |
| `chart-2` | `220 68% 52%` | In-progress and comparison data |
| `chart-3` | `35 88% 55%` | Pending and cost warnings |
| `sidebar` | `221 36% 15%` | Persistent command navigation |
| `sidebar-accent` | `221 27% 23%` | Sidebar hover and secondary panel |

### Color rules

1. Use `bg-background`, `text-foreground`, `bg-card`, `border-border`, and related semantic classes by default.
2. Teal means recovered, healthy, connected, active, or actionable.
3. Blue means in progress, informational, or comparative—not success.
4. Yellow means pending, live, attention, or the selected navigation state.
5. Red is reserved for failed payments, irreversible actions, and danger-zone controls.
6. Never use a bright color as a large page background. Use color in icons, status badges, progress bars, and one featured KPI.
7. Maintain WCAG AA contrast for body text and interactive controls. Do not use muted text for essential information.

## 4. Typography

Use two font families only:

- **DM Sans** — body copy, headings, labels, buttons, navigation, and UI controls.
- **Space Mono** — currency, percentages, IDs, timestamps, metric values, eyebrow labels, and other operational data.

The fonts are loaded in `src/index.css` and mapped to `--app-font-sans` and `--app-font-mono`.

### Type scale

| Use | Classes / guidance |
|---|---|
| Page title | `text-[30px] sm:text-[38px] font-bold tracking-[-.04em]` |
| Section title | `text-lg font-bold tracking-tight` |
| Metric value | `font-mono text-4xl font-bold` or `text-[30px] sm:text-[34px]` |
| Body | `text-sm leading-6` |
| Supporting copy | `text-xs leading-5 text-muted-foreground` |
| Field label | `text-[11px] font-bold text-muted-foreground` |
| Eyebrow | `.eyebrow`: Space Mono, 10px, 700, uppercase, `letter-spacing: .12em` |
| IDs and metadata | `font-mono text-[10px]` or `text-xs` |
| Button | `text-xs font-bold` |

### Typography rules

- Use `text-balance` on page headings when wrapping is possible.
- Use `text-pretty` for descriptions and empty-state copy.
- Use tabular numerals for metric values and financial figures.
- Do not use all caps for paragraph text.
- Use sentence case for page titles and controls; reserve uppercase for eyebrow labels and compact metadata.
- Use the period accent pattern in page titles: `Analytics.` with the final period in `text-primary`.
- Financial values should use Indian locale formatting through the existing helpers, not hand-built strings.

## 5. Layout and spacing

The app uses a fixed desktop sidebar with a fluid content workspace.

- Sidebar width: `248px`; collapsed width: `76px`.
- Header height: `72px`; sidebar brand row: `86px`.
- Desktop content padding: `36px`; mobile content padding: `20px`.
- Primary page max width: `1440px`; settings max width: `1080px`.
- Standard card/panel padding: `20px` mobile, `24px` desktop.
- Standard page section spacing: `24px` to `32px`.
- Standard component gap: `16px`.
- Use Flexbox for toolbars, rows, and alignment. Use Grid for KPI grids, tables, and two-dimensional dashboard compositions.
- Start mobile-first. Collapse multi-column layouts below `md` or `lg` as appropriate.
- Do not use arbitrary pixel positioning for layout. Absolute positioning is reserved for overlays, chart labels, and the mobile scrim.

### Page composition

1. Page eyebrow and title block.
2. Primary action or range control aligned to the title block.
3. KPI or summary row.
4. Main analytical content in one or two columns.
5. Detail table, queue, or secondary operational cards.
6. Bottom utility/status row only when it provides real operational context.

## 6. Surfaces, borders, and radii

- Base radius: `10px`.
- Small controls: `8px`.
- Cards and panels: `14px` / `rounded-2xl`.
- Pills and statuses: `rounded-full`.
- Buttons, selects, inputs: `rounded-xl`.
- Prefer 1px borders over heavy shadows.
- Use the existing subtle shadow: `0 10px 24px hsl(221 34% 15% / .035)`.
- Hover elevation may use `0 16px 30px hsl(221 34% 15% / .07)`.
- Avoid nested cards unless the inner surface represents a distinct state or data group.
- Use dashed borders only for empty states or drop zones.

## 7. Component rules

### App shell

- Keep navigation labels and icons aligned on a consistent 18px icon box.
- Active nav uses `bg-sidebar-primary`, dark ink text, and a restrained yellow shadow.
- Sidebar health summary is informational, not interactive.
- Header should show workspace context on desktop and compact account/menu actions on mobile.
- Keep the shell mounted across route changes and error boundaries.

### Buttons

Use the shared `Button` component. Variants:

- `primary`: teal filled, for the main action on a page.
- `secondary`: card background with border, for refresh, export, and alternate actions.
- `ghost`: low-emphasis inline actions.
- `danger`: destructive or pause actions only.

Buttons should have clear labels, a minimum comfortable hit area, visible focus rings, disabled opacity, and an icon only when it reinforces the action.

### KPI cards

- Label with an eyebrow and a compact icon tile.
- Metric value is the visual anchor; use Space Mono.
- Supporting detail sits below the metric and should not compete with it.
- Trend indicators require a direction and a comparison label; never show an unexplained decorative percentage.
- Use one featured colored card per KPI group at most.

### Status badges

Use `StatusBadge` for recovery state. Keep the structure consistent: dot, optional progress icon, label. Do not encode status by color alone; the label must remain visible.

- Success: teal.
- In progress: blue with a subtle spinner.
- Pending: yellow/orange.
- Failed: destructive red where a failed state is represented.

### Tables and lists

- Use a visible column header on desktop and a prioritized two-column mobile layout.
- Keep customer identity, amount, and status visible at all widths.
- Use hover fill, not row shadows.
- IDs and dates use mono text and muted color.
- Every row that navigates must have a clear focus state and a semantic link.

### Forms and settings

- Labels sit above controls.
- Inputs use card/background surfaces, a 1px border, and teal focus state.
- Toggle controls must expose `role="switch"` and `aria-checked`.
- Dangerous actions must be visually separated and require confirmation in a real implementation.
- Keep form feedback close to the submit action and also use the existing toast system for async results.

### Charts and data visualization

- Prefer direct labels and simple bars/lines over decorative chart chrome.
- Use only the defined chart colors.
- Use tooltips for exact values; retain accessible summaries in text.
- Zero or missing data needs an explicit empty state, not a blank chart.
- Keep axes and grid lines low contrast; data should dominate.
- Never imply trend direction from color alone.

## 8. Motion and interaction

Existing motion utilities are the source of truth:

- `.page-enter` for route arrival.
- `.stagger` for sequential card entry.
- `.bar-grow` for bar chart entrance.
- Button hover uses a small vertical lift; active state returns to baseline.

Rules:

- Keep animations under 700ms.
- Motion should communicate hierarchy or state change, never decorate a static page.
- Respect `prefers-reduced-motion: reduce`; the existing global rule must remain.
- Do not animate financial numbers continuously after the initial update.
- Avoid simultaneous animation on more than one large section.

## 9. Accessibility requirements

- Use semantic landmarks: `aside`, `header`, `main`, `nav`, `section`, and headings in order.
- Every icon-only control needs an accessible label.
- Every image needs meaningful alt text, or `alt=""` when decorative.
- Preserve visible `:focus-visible` outlines with the accent color.
- Maintain keyboard access to navigation, filters, tables, tabs, switches, and dialogs.
- Do not rely on hover for essential information.
- Announce async error and success states through the existing toast system where appropriate.
- Use `aria-current` or equivalent active navigation semantics when possible.
- Check contrast in both the warm workspace and dark sidebar contexts.

## 10. Responsive behavior

### Mobile

- Sidebar becomes an off-canvas navigation with scrim and close control.
- Header hides workspace breadcrumb and keeps menu/account actions.
- KPI cards become two columns, then one column on narrow screens.
- Tables prioritize identity, amount, and status; hide secondary metadata.
- Toolbars stack search, filters, sorting, and export controls.
- Avoid horizontal scrolling except for intentional filter/tab rows.

### Desktop

- Sidebar remains fixed and supports collapsed mode.
- Dashboard layouts use two-column compositions only when both panels remain readable.
- Keep content centered within the route max width.
- Preserve generous outer whitespace so the data blocks remain visually distinct.

## 11. Content and data formatting

- Use concise operational language: “Recovery rate”, “Revenue recovered”, “At risk right now”, “Active recoveries”.
- Avoid generic marketing copy inside the product.
- Use `INR`/`₹` formatting consistently via `formatINR` and `formatCompactINR`.
- Show the time period beside every aggregate metric.
- Label provider-backed versus API-calculated values when that distinction matters.
- Empty states should explain what will make data appear and provide a recovery action when possible.
- Error states should explain the failed dependency without exposing internal stack traces or secrets.

## 12. Engineering guardrails for design changes

- Add or update semantic tokens in `src/index.css` before introducing a new color.
- Reuse `Button`, `StatusBadge`, `StatCard`, `SectionHeading`, `SearchBox`, `SelectControl`, `Skeleton`, and `EmptyState` before creating variants.
- Keep page-specific styles in Tailwind classes unless a repeated pattern belongs in a shared component or CSS utility.
- Do not introduce another font family, icon set, chart palette, shadow language, or radius system.
- Keep API loading, error, and empty states present in every data-backed page.
- Verify all new visible behavior in the browser at the current desktop viewport and at a narrow mobile viewport.
- Run the dashboard package typecheck and build after visual changes.

## 13. Recommended future extensions

- Add a formal light/dark theme token set only if both modes receive complete contrast review.
- Add a reusable `DataTable` primitive when the recovery ledger and analytics tables share sorting, pagination, and responsive behavior.
- Add a reusable `MetricCard` variant for period comparison instead of repeating KPI markup.
- Add chart accessibility summaries for trend and funnel visualizations.
- Replace placeholder account menu and danger-zone confirmations with real dialogs while preserving the current spacing and semantic hierarchy.

## 14. Design acceptance checklist

Before shipping a design change:

- [ ] Uses the existing 3–5 color system and semantic tokens.
- [ ] Uses DM Sans and Space Mono only.
- [ ] Uses Flexbox/Grid rather than positional layout hacks.
- [ ] Works at mobile and desktop widths.
- [ ] Has loading, empty, error, and success states where data is asynchronous.
- [ ] Has visible keyboard focus and accessible names.
- [ ] Does not add decorative gradients, blobs, or unexplained metrics.
- [ ] Uses existing components and formatting helpers where applicable.
- [ ] Respects reduced motion.
- [ ] Passes typecheck, build, and browser verification.
