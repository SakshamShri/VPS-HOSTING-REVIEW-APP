# End-User Polls: Category & Timing Enforcement

This step extends **end-user invite-only poll creation** while strictly enforcing:

- Category permissions (child + ACTIVE + effectiveClaimable=YES + effectiveRequestAllowed=YES).
- Poll timing rules (instant vs scheduled).
- Existing invite-only, one-vote-per-person security.

Admin poll masters and voting logic remain unchanged.

---

## Backend Changes

### 1. UserPoll now references a Category

- File: `backend/prisma/schema.prisma`
- Model changes:

```prisma
model UserPoll {
  id             BigInt        @id @default(autoincrement())
  creator_id     BigInt
  creator        User          @relation("UserPollCreator", fields: [creator_id], references: [id])
  category_id    BigInt?
  category       Category?     @relation(fields: [category_id], references: [id])
  title          String
  description    String?       @db.Text
  source_info    String?       @db.Text
  type           UserPollType
  status         UserPollStatus
  is_invite_only Boolean       @default(true)
  start_at       DateTime?
  end_at         DateTime?
  created_at     DateTime      @default(now())
  updated_at     DateTime      @updatedAt

  options        UserPollOption[]
  invites        UserPollInvite[]
}
```

> Run `npx prisma migrate dev` after this change so the DB schema is in sync.

### 2. Category Permission Enforcement for UserPoll

- File: `backend/src/services/userPoll.service.ts`
- New helper: `ensureAllowedUserCategory(categoryId: CategoryId)`.

Logic:

1. Load category by id.
2. Require:
   - Category exists.
   - `is_parent === false` (must be a **child** category).
   - `status === "ACTIVE"`.
3. Resolve effective values via inheritance:

   ```ts
   const effective = await inheritanceService.resolveEffectiveCategory(categoryId);
   const { effectiveClaimable, effectiveRequestAllowed, effectiveStatus } = effective;
   ```

4. Require:
   - `effectiveStatus === "ACTIVE"`.
   - `effectiveClaimable === "YES"`.
   - `effectiveRequestAllowed === "YES"`.

5. Throw errors with codes (`CATEGORY_NOT_FOUND`, `CATEGORY_NOT_CHILD`, `CATEGORY_NOT_ACTIVE`, `CATEGORY_NOT_ALLOWED`) if any rule fails.

`createPollForUser` now calls this helper before creating a `UserPoll` and sets `category_id`:

```ts
await ensureAllowedUserCategory(input.categoryId);

const poll = await prisma.userPoll.create({
  data: {
    creator_id: userId,
    category_id: input.categoryId,
    ...
  },
});
```

This guarantees end-user polls can only exist in **allowed child categories**.

### 3. Strict Timing Validation on Creation

- File: `backend/src/controllers/userPoll.controller.ts`

`createPollSchema` now includes `category_id`:

```ts
const createPollSchema = z.object({
  category_id: z.string().min(1),
  type: z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "RATING", "YES_NO"]),
  ...
});
```

Timing rules in `createUserPollHandler`:

```ts
const now = new Date();
const startAt =
  parsed.start_mode === "SCHEDULED" && parsed.start_at ? new Date(parsed.start_at) : null;
const endAt = parsed.end_at ? new Date(parsed.end_at) : null;

if (parsed.start_mode === "SCHEDULED" && !startAt) {
  return res.status(400).json({ message: "start_at is required for scheduled polls" });
}

if (parsed.start_mode === "SCHEDULED" && startAt && startAt <= now) {
  return res.status(400).json({ message: "start_at must be in the future" });
}

if (endAt && startAt && endAt <= startAt) {
  return res.status(400).json({ message: "end_at must be after start_at" });
}

if (parsed.start_mode === "INSTANT" && endAt && endAt <= now) {
  return res.status(400).json({ message: "end_at must be after current time" });
}
```

These mirror the **GOAL** timing rules:

- **Instant Start**: `start_at = now`, `end_at` optional but must be later than now.
- **Scheduled Start**: `start_at` required, must be in future; `end_at` optional but if present, must be after `start_at`.

Errors from `ensureAllowedUserCategory` are mapped to **403 Forbidden**:

```ts
const code = (err as any)?.code as string | undefined;
if (
  code === "CATEGORY_NOT_FOUND" ||
  code === "CATEGORY_NOT_CHILD" ||
  code === "CATEGORY_NOT_ACTIVE" ||
  code === "CATEGORY_NOT_ALLOWED"
) {
  return res.status(403).json({ message: "Category is not allowed for user polls" });
}
```

### 4. User-Safe Category Listing Endpoint

- File: `backend/src/controllers/userCategory.controller.ts`
- Route: `GET /user/categories/claimable`
- Wired in `backend/src/routes/user.routes.ts`.

Handler:

1. Requires authenticated USER via `requireUser`.
2. Calls `categoryService.getCategoryTree()` to get the full category hierarchy.
3. Recursively maps to `UserCategoryNodeDTO` while **filtering**:
   - Parent nodes are included only if they have at least one allowed child.
   - Child nodes are included **only if**:
     - `status === "ACTIVE"`.
     - Effective category values (via `getEffectiveCategory`) satisfy:
       - `effectiveStatus === "ACTIVE"`.
       - `effectiveClaimable === "YES"`.
       - `effectiveRequestAllowed === "YES"`.

Response shape:

```jsonc
{
  "categories": [
    {
      "id": "1",
      "name": "Parent Category",
      "type": "parent",
      "status": "active",
      "children": [
        {
          "id": "2",
          "name": "Child Category",
          "type": "child",
          "status": "active",
          "children": []
        }
      ]
    }
  ]
}
```

This endpoint is **read-only** and user-facing; admin category APIs remain admin-only.

---

## Frontend Changes

### 1. User Category API

- File: `frontend/src/api/userCategory.api.ts`

```ts
export interface UserCategoryNode {
  id: string;
  name: string;
  type: "parent" | "child";
  status: "active" | "disabled";
  children?: UserCategoryNode[];
}

export async function fetchUserClaimableCategories(): Promise<UserCategoryNode[]> {
  const token = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/categories/claimable`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to load categories (${res.status})`);
  }

  const data = (await res.json()) as { categories: UserCategoryNode[] };
  return data.categories ?? [];
}
```

### 2. CreateUserPoll API Payload

- File: `frontend/src/api/userPoll.api.ts`

`CreateUserPollRequest` now includes `category_id`:

```ts
export interface CreateUserPollRequest {
  category_id: string;
  type: UserPollType;
  title: string;
  ...
}
```

The `/user/polls` backend endpoint expects this and uses it for category validation.

### 3. `/polls/create` 6-Step Wizard

- File: `frontend/src/pages/UserPollCreatePage.tsx`

The wizard now has **six** steps:

1. **Category** – select allowed category.
2. **Type** – choose poll experience (template).
3. **Details** – title + description.
4. **Options** – dynamic options (min 2).
5. **Timing** – instant vs scheduled + start/end times.
6. **Publish** – invite & share (unchanged logic).

#### Step 1 – Category Selection

State:

```ts
const [categories, setCategories] = useState<UserCategoryNode[]>([]);
const [categoriesLoading, setCategoriesLoading] = useState(false);
const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
```

On entering Step 1, categories are loaded via `fetchUserClaimableCategories()`.

UI behavior:

- **Parent categories** are rendered as labels (not clickable).
- **Child categories** are shown as selectable buttons.
- `canGoNext()` requires `selectedCategoryId` for Step 1.

#### Step 2 – Poll Type

Existing type selection UI is reused, now as Step 2.

#### Step 3 – Poll Details

Existing title + description + source info UI moves to Step 3.

#### Step 4 – Poll Options

Existing options editor (min 2 options, dynamic add/remove) moves to Step 4.

`canGoNext()` for Step 4 requires at least two non-empty options.

#### Step 5 – Timing Configuration

New timing UI:

- Start mode toggle:
  - **Instant start**.
  - **Scheduled start**.
- Fields:
  - `startAt` (`datetime-local`), required when mode = `SCHEDULED`.
  - `endAt` (`datetime-local`), optional.

Front-end validation in `canGoNext()` mirrors backend rules:

- **Scheduled**:
  - `startAt` must be present and in the **future**.
  - If `endAt` set, it must be strictly after `startAt`.
- **Instant**:
  - If `endAt` set, it must be strictly after **now**.

#### Step 6 – Invite & Publish

Existing invite-only targeting and publish UI becomes Step 6:

- Configure existing groups, new group, and individual mobiles.
- On publish:
  - Call `createUserPoll` with `category_id`, `type`, `title`, `options`, `start_mode`, `start_at`, `end_at`, `source_info`.
  - Then call `createUserPollInvites` to generate WhatsApp links.
  - Build and display the **owner share link** (`/polls/:pollId?ref=owner`).

Navigation buttons updated:

- `Next` advances up to Step 6.
- Final step shows `Publish poll` button.

---

## Why User Polls Are Invite-Only

- The `UserPoll` model still has `is_invite_only` hard-coded to `true` on creation.
- All user polls rely on `UserPollInvite` entries for access control.
- Even with category + timer support, **no public user polls** are created.
- Voting remains tied to invite acceptance, and one-vote-per-person rules continue to be enforced by the existing invite + vote logic.

---

## Summary

- **Categories**: End users can only create polls in **child** categories that are ACTIVE and whose effective permissions allow claiming and user requests.
- **Timing**: Instant vs scheduled poll timing is validated both client-side and server-side to prevent invalid windows.
- **Security**: User polls remain invite-only, using the existing invite system; voting logic is unchanged.
- **Admin**: Admin poll masters and admin category/product APIs are not modified; only new user-facing read-only endpoints and validations are added.
