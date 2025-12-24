# Step 10 – Admin Poll Instances

This step adds **Admin Poll Instances** on top of the existing Poll Config
Master. Admins can now create and manage *poll instances* that reuse
previously defined Poll Config (Poll DNA), without implementing any
voting or user-facing feed.

> **Out of scope for this step**
>
> - No voting endpoints or logic.
> - No user poll creation.
> - No user feed / client display.

---

## 1. Poll Config vs Poll Instance

### Poll Config (Poll DNA)

- Defined in **Step 8/9**.
- Represents a **reusable blueprint**:
  - UI template (cards, list, rating, etc.).
  - Theme (tone + accent colors).
  - Rules and permissions.
  - Versioned, with a lifecycle (`DRAFT` → `ACTIVE` → `DISABLED`).
- Stored in the `poll_configs` table.
- One Poll Config can be used by many poll instances.

### Poll Instance

- New concept in **Step 10**.
- Represents a **single run** of a poll:
  - Has its own title and description (admin-facing copy).
  - Targets exactly **one child category**.
  - Uses exactly **one Poll Config** (which provides the DNA/behavior).
  - Has its own lifecycle (`DRAFT` → `PUBLISHED` → `CLOSED`).
  - Can optionally be scheduled (start/end times).
- Stored in the new `polls` table.

Relationship:

- `PollConfig` defines **what** a poll looks like and how it behaves.
- `Poll` defines **where and when** a specific run of that config happens.

---

## 2. Backend – Polls model and APIs

### Prisma model

File: `backend/prisma/schema.prisma`

```prisma
enum PollStatus {
  DRAFT
  PUBLISHED
  CLOSED
}

model Poll {
  id             BigInt     @id @default(autoincrement())
  title          String
  description    String?    @db.Text

  poll_config_id BigInt
  pollConfig     PollConfig @relation(fields: [poll_config_id], references: [id])

  category_id    BigInt
  category       Category   @relation(fields: [category_id], references: [id])

  status         PollStatus @default(DRAFT)
  start_at       DateTime?
  end_at         DateTime?

  created_at     DateTime   @default(now())
  updated_at     DateTime   @updatedAt
}
```

`Category` and `PollConfig` also gained back-reference arrays:

```prisma
model Category {
  // …existing fields…
  pollConfigs PollConfig[]
  polls       Poll[]
}

model PollConfig {
  // …existing fields…
  polls Poll[]
}
```

### API endpoints

New routes (mounted in `src/app.ts` via `pollRouter`):

- `POST   /polls`
- `PUT    /polls/:id`
- `GET    /polls`
- `GET    /polls/:id`
- `POST   /polls/:id/publish`
- `POST   /polls/:id/close`

#### Validation

File: `backend/src/validators/poll.validator.ts`

- `pollCreateSchema`:
  - `title` (required)
  - `description` (optional)
  - `categoryId` (string, required)
  - `pollConfigId` (string, required)
  - `startAt` / `endAt` (optional ISO datetime strings)
- `pollUpdateSchema` is the partial version.

#### Service and business rules

File: `backend/src/services/poll.service.ts`

Key rules enforced server-side:

- **Category must be a child and ACTIVE**
  - Helper `ensureChildActiveCategory(categoryId)` checks:
    - Category exists.
    - `is_parent === false`.
    - `status === ACTIVE`.
  - Applied to both create and update (when category changes).
- **Poll Config must be ACTIVE**
  - Helper `ensureActivePollConfig(pollConfigId)` ensures:
    - Config exists.
    - `status === ACTIVE`.
  - Applied to create and update (when config changes), and to publish.
- **Published poll becomes read-only**
  - `update` throws `NOT_EDITABLE` if `status !== DRAFT`.
  - So only `DRAFT` polls can be edited via `PUT /polls/:id`.
- **Publish / Close transitions**
  - `publish(id)`:
    - Allowed only from `DRAFT`.
    - Re-checks category is ACTIVE and config is ACTIVE.
    - Sets `status = PUBLISHED` and `start_at` (if not already set) to `now`.
  - `close(id)`:
    - Allowed only from `PUBLISHED`.
    - Sets `status = CLOSED` and `end_at` (if not already set) to `now`.

Repository and DTOs live in:

- `backend/src/repositories/poll.repository.ts`
- `backend/src/types/poll.types.ts`

The service exposes list/detail DTOs that include:

- `category_path` – e.g. `Parent > Child`.
- `poll_config_name` – for display in the admin list.

#### Controller behavior

File: `backend/src/controllers/poll.controller.ts`

- Maps Zod validation errors and service errors to HTTP responses:
  - `CATEGORY_NOT_CHILD`, `CATEGORY_NOT_ACTIVE`, `CATEGORY_NOT_FOUND` → `400`.
  - `CONFIG_NOT_ACTIVE`, `CONFIG_NOT_FOUND` → `400`.
  - `NOT_FOUND` → `404`.
  - `NOT_EDITABLE` → `400` with message "Published or closed polls cannot be edited".
  - `INVALID_STATUS` on publish/close → `400`.
- Update endpoint does **not** allow direct status changes; status moves only
  via `publish` and `close` endpoints.

---

## 3. Frontend – Admin Poll Instances UI

### Routes

File: `frontend/src/App.tsx`

New admin routes under `AdminLayout`:

- `/admin/polls` – Poll List page.
- `/admin/polls/new` – Create Poll page.
- `/admin/polls/:id/edit` – Edit Poll page.

### Navigation

File: `frontend/src/layout/Sidebar.tsx`

Added a new sidebar item:

- **Poll Instances** → `/admin/polls`

This sits alongside:

- Dashboard
- Poll Category Master
- Poll Master (Poll Configs)

### Poll list page

File: `frontend/src/pages/PollListPage.tsx`

- Uses `fetchPolls`, `publishPoll`, and `closePoll` from
  `frontend/src/api/poll.api.ts`.
- Displays a table with:
  - **Title** – clickable to edit that poll.
  - **Category** – `Parent > Child` path from backend.
  - **Poll Config** – config name.
  - **Status** – `DRAFT` / `PUBLISHED` / `CLOSED` badge.
  - **Schedule** – derived from `startAt` / `endAt`.
  - **Actions** – Publish / Close buttons.
- Buttons are disabled while a publish/close is in progress for that row.
- Publish/Close actions re-fetch the list after completion.

### Poll create/edit page

File: `frontend/src/pages/PollFormPage.tsx`

Props:

- `mode: "create" | "edit"` (wired from routes).

Data loading:

- Fetches **ACTIVE child categories** via
  `fetchActiveChildCategories()` (wrapper around the category tree API).
- Fetches **Poll Configs** via `fetchPollConfigs()` and filters to
  `status === "ACTIVE"`.
- In edit mode, fetches the poll via `fetchPoll(id)` (from `poll.api.ts`) and
  hydrates form values, including current status.

Form sections:

1. **Basic Info**
   - Poll Title
   - Description

2. **Category**
   - A `<select>` listing only **ACTIVE child categories**.

3. **Poll Config**
   - A `<select>` listing only **ACTIVE Poll Configs**.

4. **Schedule (optional)**
   - Start time
   - End time
   - Backed by `datetime-local` inputs.

5. **Status actions**
   - **Save as Draft** (primary button)
     - In create mode, calls `POST /polls` via `createPoll` and then navigates
       into the edit route.
     - In edit mode, calls `PUT /polls/:id` via `updatePoll`.
   - **Publish** (outline button)
     - Only enabled in edit mode when status is `DRAFT`.
     - Calls `POST /polls/:id/publish` via `publishPoll`, then reloads the poll.

Read-only behavior:

- When a poll is `PUBLISHED` or `CLOSED`:
  - All form inputs are disabled.
  - **Save as Draft** and **Publish** buttons are disabled.
  - This mirrors the backend rule that only `DRAFT` polls are editable.

### Polls API client

File: `frontend/src/api/poll.api.ts`

- `fetchPolls()` → `GET /polls` → `PollListItem[]`.
- `fetchPoll(id)` → `GET /polls/:id` → editor values.
- `createPoll(values)` → `POST /polls` → returns new poll ID.
- `updatePoll(id, values)` → `PUT /polls/:id`.
- `publishPoll(id)` → `POST /polls/:id/publish`.
- `closePoll(id)` → `POST /polls/:id/close`.

The client handles:

- Mapping backend `PollStatus` enums to frontend union types and back.
- Converting ISO datetimes to/from `datetime-local` input values.

---

## 4. Poll lifecycle

Lifecycle for a Poll **Instance**:

1. **Draft (DRAFT)**
   - Created via `POST /polls`.
   - Editable via `PUT /polls/:id`.
   - Category must be:
     - A **child** category.
     - `ACTIVE`.
   - Poll Config must be:
     - Existing.
     - `ACTIVE`.

2. **Published (PUBLISHED)**
   - Transition via `POST /polls/:id/publish`.
   - Only allowed from `DRAFT`.
   - Re-validates that category and config are still valid/active.
   - Sets `start_at` if not already set.
   - Once published:
     - Poll is **read-only** in both backend and admin UI.

3. **Closed (CLOSED)**
   - Transition via `POST /polls/:id/close`.
   - Only allowed from `PUBLISHED`.
   - Sets `end_at` if not already set.
   - Represents a completed run; still no voting aggregation is implemented
     in this step.

Poll **Configs** keep their own lifecycle (`DRAFT`/`ACTIVE`/`DISABLED`), and the
rules enforce that only `ACTIVE` configs can be used to create or publish
instances.

---

## 5. Why voting is not implemented here

This step deliberately **stops at admin poll instance management**.

What exists now:

- A fully functional admin surface to:
  - Define reusable Poll Config blueprints.
  - Create Poll Instances bound to child categories and active configs.
  - Schedule and publish/close those instances.
- A backend data model (`polls`, `poll_configs`, `categories`) that is ready
  for a future voting implementation.

What does **not** exist yet (by design):

- No endpoints for casting votes.
- No aggregation of results.
- No user-facing feed or poll display.
- No user-authenticated participation flows.

Keeping Step 10 focused on admin management ensures that the data model and
admin workflows are stable before adding the complexity of real-time voting,
rate limiting, or user experience concerns.

---

## 6. Running migrations

After pulling these changes, update your database and Prisma Client from the
`backend/` directory:

```bash
# 1) Apply schema changes (adds polls table and enums)
npm run prisma:migrate

# or equivalently
# npx prisma migrate dev --name add-polls

# 2) Regenerate Prisma Client
yarn prisma:generate  # or: npm run prisma:generate
```

Then restart the backend dev server:

```bash
npm run dev
```

Once the server is running, the admin frontend can use the new Poll Instances
screens end-to-end without any voting or user feed logic.
