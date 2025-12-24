# Minimal User Feed for Admin Polls

This step adds a **minimal user feed** so that admin-created, public, live polls appear on the **User Feed** page for authenticated users.

The goal is strictly limited to **listing** eligible polls. No changes were made to voting, invites, results, or admin logic.

---

## Root Cause

Originally, admin polls were **never shown** on the User Feed because:

- `UserFeedPage.tsx` contained **only static demo/example cards**.
- There was **no backend endpoint** exposing public polls for end users.
- The frontend did not call any poll listing API from the feed page.

So even though admin polls existed in the database and could be published and voted on, **no code ever requested them for the feed**, and the UI simply rendered hardcoded content.

---

## New Endpoint: `GET /user/feed`

A minimal user-facing endpoint was added under the **user router** to power the feed.

### Route

- **Method:** `GET`
- **Path:** `/user/feed`
- **Auth:** Requires authenticated **USER** role via `requireUser` middleware.

### Controller

- File: `backend/src/controllers/feed.controller.ts`
- Handler: `feedController.listUserFeed`

Flow:

1. Calls `pollService.listForUserFeed()`.
2. Maps the internal DTO to a small JSON payload:

   ```jsonc
   {
     "polls": [
       {
         "id": "123",
         "title": "...",
         "description": "...",
         "status": "PUBLISHED",
         "categoryName": "Some Category",
         "startAt": "2025-01-01T10:00:00.000Z",
         "endAt": "2025-01-01T12:00:00.000Z"
       }
     ]
   }
   ```

### Service Logic: `listForUserFeed`

- File: `backend/src/services/poll.service.ts`
- New method: `listForUserFeed(): Promise<PollFeedItemDTO[]>`

Implementation uses existing repository and inheritance helpers:

1. Fetches polls with relations via `pollRepository.listWithRelations()`.
2. Applies **strict filters** in memory:

   - `poll.status === "PUBLISHED"` – only live polls.
   - `poll.start_at <= now` (if `start_at` is set) – hides future-scheduled polls.
   - `poll.category.status === "ACTIVE"` – category must be active.
   - `inheritanceService.resolveEffectiveCategory(category_id)` returns an effective category whose `effectiveStatus === "ACTIVE"` – enforces inherited status rules.
   - PollConfig permissions (from `pollConfig.permissions` JSON):
     - `visibility` defaults to `"PUBLIC"`.
     - `visibility` must be `"PUBLIC"`.
     - `inviteOnly` must **not** be `true`.

3. For each poll that passes filters, returns a `PollFeedItemDTO`:

   ```ts
   {
     id: poll.id,
     title: poll.title,
     description: poll.description ?? null,
     status: poll.status,
     category_name: poll.category.name_en,
     start_at: poll.start_at ?? null,
     end_at: poll.end_at ?? null
   }
   ```

> Note: This logic reuses the same **category inheritance rules** already used elsewhere; it does not alter any business logic, only repurposes it for read-only feed filtering.

---

## Feed Visibility Rules

The `/user/feed` endpoint returns a poll **only if all** of the following are true:

1. **Status**
   - `poll.status === "PUBLISHED"`.
   - Draft or closed polls are never shown.

2. **Start time**
   - If `poll.start_at` is not null: `poll.start_at <= now`.
   - Polls scheduled in the future are hidden until they reach their start time.

3. **Category status**
   - Direct category: `poll.category.status === "ACTIVE"`.
   - Effective (inherited) status via `inheritanceService` is `ACTIVE`.

4. **PollConfig permissions** (from `pollConfig.permissions` JSON):
   - `visibility` (defaulting to `"PUBLIC"`) must be exactly `"PUBLIC"`.
   - `inviteOnly` must **not** be `true`.

### Why invite-only polls are excluded

- Invite-only polls are intended for **targeted audiences**, not for general discovery via the feed.
- Including them would leak the existence of private campaigns to all users.
- Therefore, the feed **only** surfaces polls that are both **public** and **not invite-only**.

User-created invite-only polls (via the user poll flow) are implemented separately and are not surfaced by this admin poll feed.

---

## Frontend Wiring: UserFeedPage

### New API helper

- File: `frontend/src/api/feed.api.ts`

```ts
export interface FeedPollItem {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  categoryName: string;
  startAt: string | null;
  endAt: string | null;
}

export async function fetchUserFeed(): Promise<FeedPollItem[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/feed`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to load user feed: ${res.status}`);
  }

  const data = (await res.json()) as { polls: FeedPollItem[] };
  return data.polls ?? [];
}
```

### UserFeedPage behavior

- File: `frontend/src/pages/UserFeedPage.tsx`
- Previous state: rendered **only static demo cards**.
- New behavior:

  1. On mount, calls `fetchUserFeed()` and stores the result in state.
  2. Shows loading and error states.
  3. Renders a card **per poll** returned by the API.
  4. Clicking a card navigates to `/polls/:id` (the existing voting page).

Key parts:

```tsx
const [polls, setPolls] = useState<FeedPollItem[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  void (async () => {
    try {
      setLoading(true);
      setError(null);
      const items = await fetchUserFeed();
      setPolls(items);
      console.log("User feed polls", items); // debug-only
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  })();
}, []);
```

Rendering:

```tsx
{loading && <p>Loading your feed…</p>}
{error && !loading && <p className="text-xs text-destructive">{error}</p>}
{!loading && !error && polls.length === 0 && (
  <p className="text-xs text-muted-foreground">
    No live public polls are available right now. Check back later.
  </p>
)}

<div className="space-y-3">
  {polls.map((poll) => (
    <article
      key={poll.id}
      className="rounded-xl border bg-card p-4 text-xs shadow-sm hover:border-emerald-500/60 hover:shadow-md cursor-pointer"
      onClick={() => {
        window.location.href = `/polls/${poll.id}`;
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Icon + Live badge */}
        </div>
        <span className="text-[11px] text-muted-foreground">{poll.categoryName}</span>
      </div>

      <p className="mt-2 text-sm font-semibold text-foreground">{poll.title}</p>
      {poll.description && (
        <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
          {poll.description}
        </p>
      )}
    </article>
  ))}
</div>
```

This keeps the visual style of the previous examples but now reflects **real admin-created polls** from the backend.

---

## Confirmation Checklist

Use this checklist to verify that admin polls appear correctly on the User Feed:

1. **Admin creates and publishes a poll**
   - Poll Config has `permissions.visibility === "PUBLIC"` (or defaults to PUBLIC).
   - `inviteOnly` is **false**.
   - Category and its effective status are **ACTIVE**.
   - Poll is published (status becomes `PUBLISHED`) and `start_at` is <= now.

2. **User logs in via OTP**
   - Obtains a valid `authToken` in `localStorage`.

3. **User opens `/user/feed`**
   - Network tab shows `GET /user/feed` with `Authorization: Bearer <authToken>`.
   - Response JSON contains the admin poll in `polls` array.

4. **Feed UI**
   - The poll is rendered as a card with:
     - Live badge
     - Title
     - Category name
     - Optional short description
   - Clicking the card navigates to `/polls/:id` (existing voting page).

5. **Negative checks**
   - Draft or closed polls do **not** appear.
   - Polls with `visibility != "PUBLIC"` do **not** appear.
   - Polls with `inviteOnly === true` do **not** appear.
   - Polls scheduled for the future (`start_at > now`) do **not** appear until their start time.

When all of the above are true, the minimal user feed is working as intended, listing **only admin-created, public, live polls** that are safe to show to users.
