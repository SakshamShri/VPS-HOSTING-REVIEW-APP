# Step 9 – Poll Config Master UI ↔ Backend Integration

This document explains how the **Poll Config Master** UI (Step 7) is now connected
end‑to‑end to the **Poll Config Master backend** (Step 8).

The goal is to:

- Persist poll configuration blueprints (Poll DNA) using the backend.
- Load, edit, publish, and clone configs from the UI.
- Keep the **live preview** strictly frontend‑only.

No voting, poll instances, or auth were implemented in this step.

---

## 1. How UI maps to backend fields

### Backend model (simplified)

Prisma model `PollConfig` (see Step 8 docs for full details):

```prisma
model PollConfig {
  id          BigInt           @id @default(autoincrement())
  name        String
  slug        String           @unique
  status      PollConfigStatus @default(DRAFT)

  category_id BigInt
  category    Category         @relation(fields: [category_id], references: [id])

  ui_template PollUiTemplate

  theme       Json
  rules       Json
  permissions Json

  version     Int              @default(1)
  created_at  DateTime         @default(now())
  updated_at  DateTime         @updatedAt
}
```

### Frontend model

File: `src/types/pollConfig.types.ts`

```ts
export interface PollConfig {
  id: string;             // maps to PollConfig.id
  name: string;           // maps to PollConfig.name
  typeId: string;         // maps to PollConfig.slug
  status: "DRAFT" | "ACTIVE" | "DISABLED"; // maps to PollConfigStatus
  template: PollTemplateType;                 // maps to PollUiTemplate
  themeTone: ThemeTone;                       // encoded in theme JSON
  accentStyle: AccentStyle;                   // encoded in theme JSON
  title: string;          // UI-only, not persisted
  description?: string;   // UI-only, not persisted
}
```

The UI keeps a separate `meta` object for backend‑only concerns:

```ts
export interface PollConfigEditorMeta {
  id?: string;            // PollConfig.id
  categoryId: string;     // PollConfig.category_id
  rules: any;             // PollConfig.rules JSON
  permissions: any;       // PollConfig.permissions JSON
  version?: number;       // PollConfig.version
  createdAt?: string;     // PollConfig.created_at
  updatedAt?: string;     // PollConfig.updated_at
}
```

### Mapping rules

Implemented in `src/api/pollConfig.api.ts`:

- **Status**
  - Backend `PollConfigStatus` ↔ frontend `PollConfigStatus` via `mapStatusFromApi` / `mapStatusToApi`.
- **Template**
  - Backend `PollUiTemplate` ↔ frontend `PollTemplateType`:
    - `STANDARD_LIST` ↔ `standard-list`
    - `YES_NO` ↔ `yes-no-cards`
    - `RATING` ↔ `rating-bar`
    - `SWIPE` ↔ `swipe-deck`
    - `POINT_ALLOC` ↔ `point-allocation`
    - `MEDIA_COMPARE` ↔ `media-compare`
- **Theme JSON**
  - Backend `theme` is a JSON blob that includes concrete colors plus the higher‑level
    tokens used by the UI:

    ```ts
    {
      primaryColor: string,
      accentColor: string,
      themeTone: ThemeTone,
      accentStyle: AccentStyle
    }
    ```

  - Helper `buildThemePayload(themeTone, accentStyle)` derives hex colors from the
    selected tone and stores both colors + tokens.
  - Helper `mapThemeFromApi(theme)` pulls `themeTone` and `accentStyle` back into the
    UI state; if missing, it defaults to `emerald` / `soft`.
- **Rules & permissions JSON**
  - Passed through as opaque `rules` / `permissions` objects.
  - The current UI does not expose rule editors yet, but the data round‑trips
    cleanly through the editor.
- **Title & description**
  - Used **only** by the live preview.
  - Not persisted; the backend remains agnostic of preview wording.

---

## 2. Save / Edit flow

### Centralized API helper

File: `src/api/pollConfig.api.ts` exposes:

- `fetchPollConfigs()` – list for Saved Blueprints section.
- `fetchPollConfig(id)` – load a single config into the editor.
- `createPollConfig(config, meta)` – POST `/poll-configs`.
- `updatePollConfig(id, config, meta)` – PUT `/poll-configs/:id`.
- `publishPollConfig(id)` – POST `/poll-configs/:id/publish`.
- `clonePollConfig(id)` – POST `/poll-configs/:id/clone`.

Each helper:

- Maps frontend types to backend JSON and back.
- Throws an `Error` with response text or status code when the API call fails.

### Page behavior

File: `src/pages/PollConfigMasterPage.tsx`

State:

- `config: PollConfig` – what the user sees and edits.
- `meta: PollConfigEditorMeta` – backend metadata.
- `blueprints` – list of configs for the Saved Blueprints panel.
- `saving`, `publishing`, `loading`, `blueprintsLoading`, `error` – UI state flags.

Routes:

- **Create**: `/admin/poll-config`
- **Edit**: `/admin/poll-configs/:id`

On load:

- Always fetches `fetchPollConfigs()` for the Saved Blueprints list.
- If `:id` is present, also calls `fetchPollConfig(id)` and hydrates `config` + `meta`.

On **Save Config** button:

- If `meta.id` is undefined → `createPollConfig(config, meta)` (POST).
  - After success, updates local state and `navigate` to `/admin/poll-configs/:id`.
- If `meta.id` exists → `updatePollConfig(meta.id, config, meta)` (PUT).
- In both cases, reloads the blueprints list via `fetchPollConfigs()`.
- Shows an inline error message if the request fails.

The Save button is disabled while saving/publishing, and also when the
configuration is in `ACTIVE` status (see Publish flow below).

---

## 3. Saved Blueprints section

### Data source

The mock blueprint list from Step 7 has been replaced with a live list
backed by the backend:

- `fetchPollConfigs()` calls `GET /poll-configs` and maps each record to:

  ```ts
  interface PollConfigListItem {
    id: string;
    name: string;
    status: PollConfigStatus;
    template: PollTemplateType;
    updatedAt: string;
  }
  ```

### UI component

File: `src/components/SavedBlueprints.tsx`

- Renders the list inside a dashed `Card`.
- Shows:
  - Name.
  - Status badge.
  - Template type.
  - Last updated (formatted using `Date.toLocaleDateString`).
- Props:

  ```ts
  items: SavedBlueprintItem[];
  loading: boolean;
  activeId?: string;
  onSelect: (id: string) => void;
  ```

- `activeId` highlights the currently loaded blueprint.
- `onSelect(id)` triggers loading that config into the editor.

### Loading a blueprint

In `PollConfigMasterPage`:

- `handleLoadBlueprint(id)` calls `fetchPollConfig(id)` and updates `config`+`meta`.
- When invoked from the create route, it also navigates to `/admin/poll-configs/:id`.

---

## 4. Publish flow

The **Publish** action is wired to the backend but the live preview remains
frontend-only.

In the page header:

- **Publish button** (outline):
  - Enabled only when `meta.id` exists.
  - Clicking it calls `publishPollConfig(meta.id)` → POST `/poll-configs/:id/publish`.
  - On success:
    - Updates `config.status` to `ACTIVE`.
    - Increments `meta.version` based on backend response.
    - Refreshes the Saved Blueprints list.
  - Shows inline error text on failure.

### Disabling destructive edits after publish

A config in `ACTIVE` status is treated as locked:

- `handleUpdate` early‑returns when `config.status === "ACTIVE"`, so the user
  cannot change name, template, theme tone, etc.
- The **Save Config** button is disabled when `config.status === "ACTIVE"`.
- Live preview still responds to whatever is in `config`, but since `config` is
  no longer editable after publish, the preview reflects the published state.

This keeps the live preview behavior purely frontend, while respecting the
backend’s lifecycle semantics.

---

## 5. Clone behavior

The **Clone** button in the header:

- Enabled when `meta.id` exists and no save/publish is in progress.
- Calls `clonePollConfig(meta.id)` → POST `/poll-configs/:id/clone`.
- On success:
  - Receives a new DRAFT config with `version = 1` from the backend.
  - Replaces `config`+`meta` with the cloned values.
  - Navigates to `/admin/poll-configs/:newId`.
  - Refreshes the Saved Blueprints list.

The cloned config is fully editable and independent of the original.

---

## 6. Why the live preview stays frontend-only

The live preview (`src/components/LivePollPreview.tsx`) is deliberately kept
frontend-only in this step:

- It consumes only `PollConfig` UI state (template, theme tone, accent style,
  title, description).
- It does **not** depend on any backend fields beyond what the editor already
  holds, and it never triggers API calls.
- Title and description are not persisted; they exist solely to let admins see
  how a poll might look without committing copy to the backend.

This separation keeps Poll Config Master as a safe design surface while the
backend focuses on storing Poll DNA (templates, themes, rules, permissions,
status, versioning).

---

## 7. Summary

With Step 9 completed:

- The Poll Config Master UI loads, saves, lists, publishes, and clones poll
  configurations using the dedicated backend APIs.
- Saved blueprints are backed by the real `poll_configs` table.
- Config lifecycle (DRAFT → ACTIVE) is enforced in the UI by disabling edits
  once published.
- The live preview remains a purely frontend concern, giving admins immediate
  visual feedback without impacting backend contracts.
