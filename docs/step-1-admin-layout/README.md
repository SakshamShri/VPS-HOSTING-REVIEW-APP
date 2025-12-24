# Step 1 – Admin Layout Shell

This step establishes the visual **foundation** of the Polls Engine admin, with the same design language you see in modern SaaS dashboards like Stripe, Vercel, and Linear. There is **no backend or business logic** here – the focus is purely on layout, typography, and interaction affordances.

---

## Layout Philosophy

- **Single, opinionated shell**  
  The admin experience is built around one high-quality layout instead of a collection of ad‑hoc pages. Every future screen (polls, users, settings) will live inside this shell.

- **Persistent, fixed sidebar**  
  Navigation anchors the product. The sidebar is fixed on the left, using a neutral surface, subtle border, and Lucide icons to create a calm but opinionated frame. It does not scroll with content; it is a stable landmark.

- **Clean top bar**  
  The top bar is sticky, with a bottom border and a slightly elevated surface (`bg-background/80` with blur). It:

  - Shows the **current page title** and optional subtitle.
  - Reserves the **right side** for future primary actions (filters, create buttons, account switchers).

- **Focused content column**  
  The main content is centered within a `container` + `max-w-5xl` column, wrapped in a white `Card` with a subtle border and shadow. This mirrors common enterprise patterns:

  - Easy to scan on large monitors.
  - Leaves generous whitespace on the sides.
  - Keeps complex forms and tables from feeling cramped.

---

## Sidebar Behavior

The sidebar is implemented in `frontend/src/layout/Sidebar.tsx`.

- **Structure**
  - Fixed width (`w-64`) on large screens.
  - Fixed positioning on the left (`fixed inset-y-0 left-0`).
  - Scrollable body using the shadcn-style `ScrollArea` component.

- **Branding Block**
  - Simple monogram badge (`PE`) with a neutral primary color.
  - Product name `Polls Engine` and a small `Admin` label to clearly indicate scope.

- **Navigation Items**
  All items use shadcn-style `buttonVariants` to keep interaction states consistent.

  - **Dashboard**  
    Visible, not active. Placeholder for a future high-level overview.

  - **Poll Category Master (ACTIVE)**  
    This is the **current screen** and is styled as the active item:
    - Secondary surface background.
    - Stronger text color.
    - Icon updated from muted to primary foreground.

  - **Poll Master – Coming Soon**  
  - **Users – Coming Soon**  
  - **Settings – Coming Soon**  

  These entries are intentionally **visible but muted**:

  - Reduced opacity.
  - `cursor-not-allowed` and `aria-disabled` for clear affordance.
  - Small `Coming soon` capsule badge on the right.

This pattern signals roadmap breadth to enterprise buyers without pretending the sections are already wired up.

---

## Top Bar Behavior

The top bar lives in `frontend/src/layout/Topbar.tsx`.

- **Positioning**
  - `sticky top-0` so it stays in view as content scrolls.
  - Bottom border to clearly separate navigation chrome from page content.

- **Content**
  - **Left**: page title and optional subtitle, forming a clear typography hierarchy.
  - **Right**: reserved inline space labelled as the future actions area. This will host filters, primary CTAs, or account controls without changing the layout.

The default usage from `AdminLayout` sets the title to **Poll Category Master** with a concise, product-oriented subtitle.

---

## Why This Matches Enterprise SaaS Dashboards

This shell intentionally mirrors design decisions from Stripe, Vercel, and similar products:

- **Clear separation of chrome vs. content**  
  Sidebar and top bar are neutral, thinly bordered, and visually quiet. The content card is the most prominent white surface.

- **Consistent spacing and rhythm**  
  - 56px top bar height (`h-14`).
  - `px-4`/`px-6` horizontal padding, `py-3`/`py-4` vertical padding in key regions.
  - Grid-based layouts (`md:grid-cols-*`) for metrics and secondary panels.

- **Neutral color palette only**  
  Colors are derived from the Tailwind/shadcn token system:

  - Structural surfaces: `bg-background`, `bg-muted`.
  - Chrome accents: `border`, `text-muted-foreground`.
  - Emphasis: `primary`, used sparingly in the brand badge and active states.

- **Subtle, intentional shadows**  
  The primary content container uses `shadow-sm`, just enough to lift it off the background without looking heavy or “cardboard”.

- **Typographic hierarchy**  
  - Page titles: `text-lg font-semibold`.
  - Section headings: `text-sm font-semibold`.
  - Meta and helper text: `text-xs text-muted-foreground`.

This combination produces an admin UI that feels **calm, premium, and expandable**, instead of a basic CRUD scaffold.

---

## Where to Plug In Real Functionality

When you are ready to add real behavior:

- **Routing**
  - `/dashboard` already uses `AdminLayout`.
  - Additional routes can wrap their pages in the same layout to inherit the chrome.

- **Sidebar Integration**
  - Replace the static `active` flags in `Sidebar.tsx` with `NavLink` from `react-router-dom` to sync visual state with the URL.

- **Content Area**
  - Swap out the placeholder cards and panels in `Dashboard.tsx` with real metrics, tables, and forms.
  - Keep the same content column width and spacing to preserve the enterprise feel.

The crucial part of this step is that the **shell is already at production visual quality**. Future work should plug into this foundation, not re‑invent layout per screen.
