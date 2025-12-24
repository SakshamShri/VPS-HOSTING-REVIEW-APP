# Voting Page Theme Sync with Admin Poll Config

This document explains how the poll **voting page** (`/polls/:id`) is themed to match the **Admin Poll Config Live Preview**, why the **feed** does not show a live preview, and how theme fallback behavior works.

---

## What Is Themed

When an admin configures a poll in **Poll Config Master** and picks a theme (tone + accent), those settings are stored on the `PollConfig` and reused on the **end-user voting page**.

For each published poll, the voting page now:

- **Reads theme information** from the poll's `PollConfig`.
- **Applies the theme colors** to:
  - **Poll card header** (icon background, header text, border).
  - **Primary action button** (submit vote button background).
  - **Status pill** ("Live now" / "Not started" / "Ended").
  - **Accent borders** around the phone-style card.

The voting experience (what the user fills / submits) is unchanged.

---

## Why the Feed Has No Preview

The **User Feed page** does **not** show a live poll preview card.

Reasons:

- The feed is meant to be a **list / navigation surface**, not a full mobile preview.
- The **Admin Live Preview** is the **source of truth for theming and template**, and is focused on _configuration_, not on how polls are discovered.
- To keep the user experience clean, we **only apply the theme on the actual voting page**, where the participant responds.

So: **no live preview card is rendered on the feed**, but when a user opens a poll to vote, that page is themed according to the admin-picked configuration.

---

## Backend: Vote Details Endpoint

A dedicated public endpoint powers the voting page theming:

- **Route:** `GET /polls/:id/vote-details`
- **Auth:** Public (no admin token required).
- **Purpose:** Provide just enough information for the voting page to render and theme the poll, without exposing admin-only configuration data.

Response shape:

```jsonc
{
  "poll": {
    "id": "123",
    "title": "...",
    "description": "...",
    "status": "PUBLISHED",
    "startAt": "2025-01-01T10:00:00.000Z",
    "endAt": "2025-01-01T12:00:00.000Z"
  },
  "pollConfig": {
    "templateType": "STANDARD_LIST", // or other enum from PollConfig.ui_template
    "theme": {
      "primaryColor": "#059669",
      "accentColor": "#ECFDF5",
      "backgroundColor": "#020617",
      "textColor": "#E5E7EB"
    }
  }
}
```

Notes:

- The `theme` object is derived from the `PollConfig.theme` JSON, which is already written by the admin UI.
- Only **safe fields** are returned (no full rules, permissions, or internal admin-only metadata).

---

## Frontend: PollVotePage Theming

The voting page (`PollVotePage.tsx`) calls the new endpoint via `fetchPollForVote` in `poll.api.ts`.

### Data shape on the frontend

```ts
export interface PollTheme {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
}

export interface PollDetailForVote {
  id: string;
  title: string;
  description: string;
  status: PollStatus;
  startAt: string | null;
  endAt: string | null;
  pollConfig: {
    templateType: string;
    theme: PollTheme;
  };
}
```

The voting page stores the theme and converts it to **CSS variables**:

```ts
const defaultTheme = {
  primaryColor: "#059669",
  accentColor: "#ECFDF5",
  backgroundColor: "#020617",
  textColor: "#E5E7EB",
};

const activeTheme = poll?.theme ?? defaultTheme;
const themeVars = {
  "--primary": activeTheme.primaryColor,
  "--accent": activeTheme.accentColor,
  "--bg": activeTheme.backgroundColor,
  "--text": activeTheme.textColor,
} as CSSProperties;
```

Those variables are applied to the phone-style card container and referenced in styles like:

- Header icon background / text: `backgroundColor: "var(--accent)"`, `color: "var(--primary)"`.
- Status pill: `bg-[var(--primary)]/10` and `text-[var(--primary)]` for the live state.
- Primary button: `bg-[var(--primary)]` with hover opacity.
- Success text: `text-[var(--accent)]`.

This makes the **end-user voting UI visually consistent** with the Admin Live Preview colors.

---

## Theme Fallback Behavior

If, for any reason, the backend does not provide a theme (e.g. old data, missing fields), the frontend applies a **safe default theme**:

```ts
const defaultTheme = {
  primaryColor: "#059669",   // emerald-like primary
  accentColor: "#ECFDF5",    // soft accent background
  backgroundColor: "#020617",// dark background, similar to existing design
  textColor: "#E5E7EB",      // light text
};
```

Fallback rules:

- If any individual color is missing from `pollConfig.theme`, that color falls back to the default.
- If `pollConfig.theme` is entirely missing, the whole theme falls back to this default.

This ensures the voting page **always renders with a coherent theme**, even for legacy polls.

---

## Non-Goals / Things Not Changed

As part of this theming work, the following behavior is **intentionally unchanged**:

- **User Feed page** layout and content:
  - No live preview cards were added.
  - The feed remains a simple list/introduction area.
- **Polling logic**:
  - How votes are submitted (`submitVote`) is unchanged.
  - Validation, status transitions (DRAFT → PUBLISHED → CLOSED) remain the same.
- **Templates / layouts**:
  - The current voting UI is a single free-text response; no template switching logic is implemented here.
  - Future template-specific layouts can reuse the same theme variables.
- **Results display**:
  - No changes were made to results visibility, aggregation, or security.

This step focuses **only on theming the voting page** so that end users see colors consistent with the Admin Poll Config Live Preview.
