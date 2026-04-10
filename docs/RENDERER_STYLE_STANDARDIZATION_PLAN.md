# Renderer Style Standardization Plan (Class API + CSS Variables)

## Goal

Move renderer styling to a strict class-based system where:

- Semantic CSS variables define color/theme values.
- Semantic component classes consume those variables.
- Tailwind in JSX is used for structure only (layout, spacing, sizing, typography rhythm).

Theme switching must be achievable by swapping variable values only.

## Non-Goals

- No visual redesign during migration.
- No route/window behavior changes.
- No ad-hoc one-off styling per page.

## Core Contract

### 0) CSS file organization

Split renderer styling by domain instead of keeping everything in a single stylesheet.

Target structure:

- `src/renderer/styles/variables.css` (tokens only)
- `src/renderer/styles/app.css`
- `src/renderer/styles/sidebar.css`
- `src/renderer/styles/titlebar.css`
- `src/renderer/styles/workspace.css`
- `src/renderer/styles/panel.css`
- `src/renderer/styles/modal.css`
- `src/renderer/styles/menu.css`
- `src/renderer/styles/forms.css`
- `src/renderer/styles/mail.css` (mail-specific visual roles only)

Rules:

- Keep all CSS variables in `variables.css` only.
- Define two complete variable sets in `variables.css`:
  - light theme (`:root`)
  - dark theme (`.dark`)
- Domain CSS files must consume variables and class APIs, not define new theme values.

### 1) Token layer (variables only)

Define semantic tokens in `src/renderer/styles/variables.css`.

Color budget policy:

- Use a constrained shared palette of approximately 10-20 base colors across the renderer.
- Semantic tokens may be numerous, but they must map back to this constrained base palette.
- Avoid introducing new one-off hex/rgb/hsl values unless an existing base color cannot satisfy accessibility/contrast.

Required token families:

- Shell: `--app-surface`, `--app-text`, `--app-border`
- Sidebar: `--sidebar-surface`, `--sidebar-text`, `--sidebar-muted`, `--sidebar-border`
- Account row and submenu:
  - `--account-item-surface`, `--account-item-hover`, `--account-item-active`, `--account-item-text`
  - `--account-submenu-surface`, `--account-submenu-hover`, `--account-submenu-text`, `--account-submenu-border`
- Titlebar:
  - `--titlebar-surface`, `--titlebar-text`, `--titlebar-muted`, `--titlebar-border`
- Content/workspace: `--content-surface`, `--content-text`, `--content-muted`, `--content-border`
- Card/panel: `--panel-surface`, `--panel-text`, `--panel-border`
- Overlay/menu: `--overlay-surface`, `--overlay-text`, `--overlay-border`
- States: `--state-hover`, `--state-active`, `--state-selected`, `--focus-ring`
- Feedback: `--color-primary`, `--color-success`, `--color-warning`, `--color-danger`, `--color-link`

Rule: components must not reference raw hex/rgb/hsl values directly.

### 2) Class API layer (semantic classes)

Define stable class APIs for each domain area.

Examples:

- Sidebar API:
  - `.sidebar`
  - `.sidebar-header`
  - `.sidebar-section`
  - `.sidebar-group`
  - `.account-item`
  - `.account-item-label`
  - `.account-item-meta`
  - `.account-submenu`
  - `.account-submenu-item`
- Titlebar API:
  - `.titlebar`
  - `.titlebar-left`
  - `.titlebar-title`
  - `.titlebar-meta`
  - `.titlebar-actions`
  - `.titlebar-button`
- Workspace API:
  - `.workspace`
  - `.workspace-header`
  - `.workspace-toolbar`
  - `.workspace-content`
  - `.workspace-statusbar`
- Shared component API:
  - `.panel`
  - `.menu`
  - `.menu-item`
  - `.list-row`
  - `.field`
  - `.button`

Rule: JSX should compose these classes, not restyle the same role repeatedly with inline color utilities.

### 3) Tailwind policy

Allowed in JSX:

- Layout and structure (`flex`, `grid`, `items-*`, `justify-*`)
- Spacing and sizing (`p-*`, `m-*`, `gap-*`, `w-*`, `h-*`, `min-*`, `max-*`)
- Typography rhythm (`text-sm`, `leading-*`, `font-*`)
- Border radius/shadow/animation/transition

Disallowed in JSX for semantic theme styling:

- `bg-*`, `text-*`, `border-*`, `ring-*`, `fill-*`, `stroke-*` color utilities for app chrome/content surfaces
- `dark:*` color utilities for theme behavior

## Architecture Checklist

### Phase 0: Reset and baseline

- [x] Mark previous style-migration checklist as superseded by this plan. (No separate legacy checklist file exists in
  `docs/`; this plan is the canonical checklist.)
- [x] Inventory current theme variables in `index.css`. (`src/renderer/index.css` is now import-only and delegates all
  tokens to `src/renderer/styles/variables.css`.)
- [x] Inventory existing semantic classes and map overlap to new API names.

Exit criteria:

- [x] Baseline snapshot complete.
- [x] No functional changes introduced.

### Phase 1: Token model definition

- [x] Add missing token families (`sidebar`, `titlebar`, `account-item`, `account-submenu`, `workspace`, `panel`,
  `menu`).
- [x] Create light/dark token blocks with identical semantic keys.
- [x] Add fallback aliases only where needed, mark with `TODO(remove-alias)`.
- [x] Document token naming rules at top of `variables.css`.
- [x] Define the canonical base color palette (10-20 colors max) and map all semantic tokens to it.
- [x] Remove redundant near-duplicate color values during token mapping.

### Phase 2: CSS file split by domain

- [x] Create `src/renderer/styles/variables.css` and move all theme variables there.
- [x] Create domain stylesheets (`app.css`, `sidebar.css`, `titlebar.css`, `workspace.css`, `panel.css`, `modal.css`,
  `menu.css`, `forms.css`, `mail.css`).
- [x] Wire imports through renderer entry/style index so load order is predictable.
- [x] Ensure domain stylesheets contain class APIs only (no token definitions).

Exit criteria:

- [x] Every major surface/text/border role has a semantic token.
- [x] Theme switch only changes token values.
- [x] Styles are split by domain and variable ownership is centralized in `variables.css`.

### Phase 3: Class API foundation

- [x] Implement class APIs for `.sidebar*`, `.account-item*`, `.account-submenu*`.
- [x] Implement class APIs for `.titlebar*`.
- [x] Implement class APIs for `.workspace*`, `.panel`, `.menu*`, `.list-row`.
- [x] Keep class responsibilities role-based (no page-specific naming).

Exit criteria:

- [x] Class API exists for all repeated renderer shells and row patterns.

### Phase 4: Shared primitives migration

- [x] Migrate `components/ui/button.tsx` to class API hooks.
- [x] Migrate `components/ui/FormControls.tsx` to class API hooks.
- [x] Migrate `components/navigation/DynamicSidebar.tsx` to `.sidebar*` + `.account-item*` classes.
- [x] Migrate `components/WindowTitleBar.tsx` to `.titlebar*` classes.
- [x] Migrate `layouts/WorkspaceLayout.tsx` to `.workspace*` classes.

Exit criteria:

- [x] Shared primitives expose class-based semantic variants.
- [x] No direct `dark:*` color styling remains in these primitives.

### Phase 5: Page migration by shell

- [x] Mail pages/components adopt `.sidebar*`, `.workspace*`, `.panel`, `.menu*`.
- [x] Contacts and calendar routes adopt the same shell classes.
- [x] Settings/debug/help pages adopt the same shell classes.
- [x] Compose/message windows adopt `.titlebar*`, `.workspace*`, `.panel`.

Exit criteria:

- [x] Cross-page shell consistency comes from shared class API.
- [x] Repeated visual roles no longer redefined per file.

### Phase 6: Cleanup and enforcement

- [x] Remove temporary token aliases.
- [x] Remove obsolete legacy semantic classes no longer used.
- [x] Ensure no raw color literals remain in renderer JSX/CSS outside token definitions.
- [x] Remove Tailwind bracket-var color usage from JSX (`bg-[var(--...)]`, `text-[var(--...)]`, `border-[var(--...)]`,
  `ring-[var(--...)]`, `fill-[var(--...)]`, `stroke-[var(--...)]`).
- [x] Add architecture rule(s) to prevent reintroduction of direct theme color utilities in JSX.
- [x] Enforce base palette budget: renderer token definitions resolve to the canonical 10-20 shared colors only.

Exit criteria:

- [x] Token-only theme values.
- [x] Class-only semantic role styling.
- [x] Tailwind used primarily for structure.

## Mechanical Migration Rules

- [x] For each replaced block, map old role to a class API role first (example: sidebar account row -> `.account-item`).
- [x] Add/adjust token first, then class, then JSX usage.
- [x] Do not introduce new page-local color class names for global roles.
- [x] If a role appears in 2+ places, it must have a shared class API name.
- [x] Prefer extending existing role classes over creating alternate synonyms.

## Validation Checklist (Per Slice)

- [x] Per-slice build/tests are optional during style migration.
- [x] Run full validation only at migration completion:
  - [ ] `npm run check:architecture` (fails on pre-existing limit: `src/renderer/pages/AppSettingsPage.tsx` is 2047
    lines)
  - [x] `npm run test:unit`
  - [x] `npm run build`
- [x] `rg -n "(bg|text|border|ring|fill|stroke)-\\[var\\(--" src/renderer` returns no matches.
- [x] Palette audit confirms token definitions use only canonical base colors (10-20 max per theme).
- [x] Plan document updated for completed slice (project no longer has `docs/OPTIMIZATION_ROADMAP.md`).

## Definition Of Done

- [x] All major UI domains use semantic token families (`sidebar`, `titlebar`, `workspace`, `panel`, `menu`,
  `account-*`).
- [x] Renderer JSX uses class APIs such as `.sidebar`, `.sidebar-header`, `.account-item`, `.account-submenu`,
  `.titlebar`.
- [x] Theme switch behavior is token-driven only.
- [x] Color system is consolidated to a canonical constrained palette (10-20 base colors per theme), with no
  uncontrolled drift.
- [ ] Final migration validation (`check:architecture`, `test:unit`, `build`) completed once at the end. (
  `check:architecture` currently fails due to pre-existing file-length guard.)
- [ ] No regressions in visual hierarchy or UX behavior.

## Baseline Snapshot (2026-04-10)

- `src/renderer/index.css` now imports Tailwind + domain CSS in a fixed order and defines no theme tokens directly.
- Legacy alias class usage was removed from renderer JSX/CSS in this slice:
  - `.sidebar-shell` -> `.sidebar`
  - `.sidebar-item` -> `.account-item`
  - `.titlebar-shell` -> `.titlebar`
  - `.panel-card` -> `.panel`
  - `.menu-action` -> `.menu-item`
