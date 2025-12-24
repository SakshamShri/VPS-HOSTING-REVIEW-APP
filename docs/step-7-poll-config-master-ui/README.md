# Step 7 3 Poll Config Master UI

This document explains the Poll Config Master ("Poll DNA") admin screen implemented in the
frontend. This step is **UI-only** 3 there is no backend or voting logic.

## What is the Poll Config Master?

The Poll Config Master is an admin experience that lets operators define reusable poll
configurations ("poll DNA") that control:

- **UI template** 3 how a poll is rendered to users (list, cards, rating, swipe, etc.).
- **Theme and accents** 3 visual treatment of the poll shell.
- **Behavioral rules** (to be wired later) 3 content rules, voting behavior, permissions,
  and results/PSI settings.

A single poll config can later be referenced by many concrete polls, so the DNA stays
consistent while polls change over time.

## How is this different from Poll & Vote?

- **Poll & Vote** is the runtime object that users see in the product.
  - It has a schedule, targeting, and live responses.
  - It is created from a specific configuration.
- **Poll Config Master** is a **design surface** for admins.
  - It never collects votes directly.
  - It defines the allowed shapes and visual templates that polls can use.

In short: Poll Config Master defines the blueprint; Poll & Vote uses that blueprint
at runtime.

## Layout and key components

The page is implemented as a three-column layout in `PollConfigMasterPage.tsx`:

1. **Left: Config navigation** (`ConfigSidebar`)
   - Vertical menu with the following sections:
     - Basic Info
     - Content Rules
     - Voting Behavior
     - Results & PSI
     - Permissions
     - UI Template (default)
   - Clicking an item updates the active section in local React state.
   - Only the **UI Template** section is fully interactive in this step; the others
     render placeholder cards indicating future configuration blocks.

2. **Center: Poll configuration panel**
   - Header with:
     - Editable **poll config name** (`Input`).
     - Read-only **type ID** (`typeId` from the mock config).
     - **Status badge** (DRAFT).
     - **Save Config** button (UI-only; logs to the console and simulates a short delay).
   - UI Template configuration:
     - Implemented by `UITemplateGrid`, a card grid of the available templates:
       - Standard List
       - Yes / No Cards
       - Rating Bar
       - Swipe Deck
       - Point Allocation
       - Media Compare
     - Only one template can be selected at a time; the selection updates the
       `PollConfig.template` field in local state.
   - Theme and accents:
     - Implemented by `ThemeSelector`.
     - Admins can pick a **theme tone** (`emerald`, `indigo`, `amber`, `rose`) and
       an **accent style** (`soft`, `bold`).
     - These values are stored on the `PollConfig` and drive the live preview styling.
   - Saved blueprints:
     - Uses mocked data from `pollConfig.mock.ts`.
     - Each blueprint has a name, type ID, template, and theme settings.
     - Clicking a blueprint replaces the current config in state with that blueprint,
       immediately updating the live preview.

3. **Right: Live mobile preview** (`LivePollPreview`)
   - Renders a mobile-sized card that simulates the in-app poll experience:
     - App header with brand name and a small "Preview" pill.
     - Poll title and optional description.
     - Options area, whose layout depends on the selected UI template.
     - Primary action button ("Submit response").
     - Result hint text explaining that no real traffic is impacted.
   - The preview uses the `PollConfig` passed in as props and responds instantly to
     any changes made in the center panel.

## Types and mock data

Types are defined in `src/types/pollConfig.types.ts`:

- `PollConfigSection` 3 union of configuration sections for the left sidebar.
- `PollTemplateType` 3 union of supported UI templates.
- `PollConfigStatus` 3 config lifecycle state (DRAFT, ACTIVE, ARCHIVED).
- `ThemeTone` and `AccentStyle` 3 constrained theme and accent options that map
  to Tailwind CSS classes.
- `PollConfig` interface describing the shape of a configuration the UI works with.

Mock data lives in `src/mocks/pollConfig.mock.ts`:

- `defaultPollConfig` 3 initial configuration when the page loads.
- `savedPollBlueprints` 3 a small list of blueprints that the sidebar can load
  into the current config.

## How the Live Preview works

The live preview is implemented in `LivePollPreview.tsx`:

- It accepts a single `PollConfig` prop.
- A small helper, `getThemeClasses`, converts the `themeTone` and `accentStyle`
  tokens into Tailwind class combinations for the header, pill, and primary button.
- Another helper, `renderTemplatePreview`, chooses a preview layout based on
  `PollTemplateType`:
  - **Standard List** 3 stacked options with radio-style markers.
  - **Yes / No Cards** 3 two responsive cards.
  - **Rating Bar** 3 horizontal bar with 10 segments.
  - **Swipe Deck** 3 layered cards hinting at swipe behavior.
  - **Point Allocation** 3 rows with a points pill.
  - **Media Compare** 3 two media placeholders labeled Variant A/B.

Because everything is wired to local React state inside `PollConfigMasterPage`,
any change in the center panel (template selection, theme tone, accent style,
blueprint selection, or config name) immediately re-renders the preview. There are
no network calls and no backend dependencies in this step.

## Tech stack and constraints

- **React + TypeScript** for component composition and type safety.
- **Tailwind CSS** for layout and spacing; no inline styles are used.
- **shadcn/ui** components (`Card`, `Button`, `Badge`, `Input`, `Separator`, etc.)
  for consistent, enterprise-grade visuals.
- All data is mocked; the Save button is intentionally UI-only.

This completes Step 7: a fully interactive, UI-only Poll Config Master screen with a
live mobile preview.
