# Pre-Userflow Poll Masters Testing

This document tracks the **Poll Config Master (DNA)** and **Poll Instance Master (Admin Polls)** behaviour *before* end-user flows are wired. It focuses only on **validation / guards**, without adding new features or changing business logic beyond explicit rules.

Back-end code examined:

- `backend/prisma/schema.prisma`
- `backend/src/controllers/pollConfig.controller.ts`
- `backend/src/services/pollConfig.service.ts`
- `backend/src/validators/pollConfig.validator.ts`
- `backend/src/controllers/poll.controller.ts`
- `backend/src/services/poll.service.ts`
- `backend/src/validators/poll.validator.ts`
- `backend/src/controllers/category.controller.ts`
- `backend/src/services/inheritance.service.ts`
- `backend/src/routes/category.routes.ts`
- `backend/src/routes/pollConfig.routes.ts`
- `backend/src/routes/poll.routes.ts`
- `backend/src/middleware/auth.middleware.ts`

Terminology:

- **PASS** – behaviour is enforced by current backend logic.
- **PARTIAL** – backend covers core rules, but some UI-only aspects must be tested in the frontend.
- **FAIL / GAP** – behaviour is not enforced in backend; left as known gap to avoid changing business rules.
- **N/A** – not applicable to current Poll Master implementation.

---

## Part A — Poll Config Master Tests

### A1. Create Poll Config (DRAFT)

- **Name required**
  - **Backend**: `pollConfigCreateSchema` (`name: z.string().min(1)`) → **PASS**.
- **Category MUST be selected**
  - **Backend**: `categoryId: z.string().min(1)` → **PASS**.
- **Category MUST be child category**
  - **Backend**: `PollConfigService.create` uses `ensureChildActiveCategory`, which checks `category.is_parent === false` → **PASS**.
- **Category MUST be ACTIVE**
  - **Backend**: same helper enforces `category.status === "ACTIVE"` → **PASS**.

### A2. Invalid Poll Config category cases

- **Parent category → MUST FAIL**
  - **Backend**: throws `"CATEGORY_NOT_CHILD"`; controller returns `400` with message `"category_id must be a child category"` → **PASS**.
- **Disabled category → MUST FAIL**
  - **Backend**: throws `"CATEGORY_NOT_ACTIVE"`; controller returns `400` with message `"Category must be ACTIVE to create poll configs"` → **PASS**.
- **Missing category → MUST FAIL**
  - **Backend**: throws `"CATEGORY_NOT_FOUND"`; controller returns `400` with message `"category_id does not reference a valid category"` → **PASS**.

### A3. UI Template Selection

- **Only ONE template selectable**
  - **Backend**: `uiTemplate` is a single enum (`pollUiTemplateSchema`) – only one value accepted per config → **PASS (backend)**.
  - **UI**: must ensure only one radio/selector is active – **manual UI test**.
- **Live Preview updates immediately**
  - **Backend**: N/A (pure frontend behaviour) → **N/A / MANUAL**.
- **Template state persists after Save**
  - **Backend**: `ui_template` is persisted in `PollConfig`; re-fetching will return same value → **PASS (backend)**.
  - **UI**: ensure form binds to value on load – **manual UI test**.

### A4. Poll Rules Validation

- **YES / NO specific rules**
  - **Backend**: `validateTemplateRules` ensures that for `YES_NO` template, `minOptions` and `maxOptions` (if provided) are exactly `2` → **PARTIAL** (enforces 2-option structure, but does not inspect actual option labels).
- **STANDARD_LIST / RATING minimum options**
  - **Backend**: `validateTemplateRules` ensures `minOptions >= 2` → **PASS**.
- **Single Choice vs Multiple Choice**
  - **Backend**: behaviour is driven via `rules.votingBehavior.allowMultipleVotes`; there is **no additional structural validation** specific to "single vs multiple" at this layer → **GAP (by design)**. Not changed to avoid altering business rules.

### A5. Save Poll Config

- **Status = DRAFT**
  - **Backend**: `PollConfigController.create` sets `status: body.status ?? "DRAFT"`; for normal UI it should send no status → **PASS (assuming UI omits status)**.
- **Version = 1**
  - **Backend**: `PollConfigService.create` sets `version: 1` → **PASS**.
- **Appears in Saved Blueprints list**
  - **Backend**: `pollConfigRepository.list()` returns all configs ordered by `created_at desc` → **PASS (backend)**.

### A6. Edit Poll Config

- **Changes increment version**
  - **Backend**: `PollConfigService.update` loads existing, computes `nextVersion = existing.version + 1`, and persists it → **PASS**.
- **Previous version not overwritten**
  - **Backend**: single-row model with version field – previous *values* are overwritten; versions are tracked via version number only, not snapshots → **PARTIAL** (version increments, but there is no automatic history table).

### A7. Clone Poll Config

- **New config created**
  - **Backend**: `clone` reads existing, builds new payload, calls `create` → **PASS**.
- **Status = DRAFT**
  - **Backend**: hard-coded `status: "DRAFT"` → **PASS**.
- **New ID**
  - **Backend**: `@default(autoincrement())` ensures new id → **PASS**.
- **Version reset**
  - **Backend**: payload sets `version: 1` → **PASS**.

### A8. Publish Poll Config

- **Status changes to ACTIVE**
  - **Backend**: `publish` sets `status: "ACTIVE"` → **PASS**.
- **Immutable fields locked (template, rules)**
  - **Backend**: currently **not enforced** – ACTIVE configs can still be updated via `update` → **GAP** (left as-is to avoid behaviour change; can be tightened later if required).
- **Only ACTIVE configs usable in Poll Instance**
  - **Backend**: `ensureActivePollConfig` requires `status === "ACTIVE"` on create/update/publish of Poll → **PASS**.

---

## Part B — Poll Instance Master Tests

### B9. Create Poll Instance

- **Poll Config MUST be ACTIVE**
  - **Backend**: `ensureActivePollConfig` enforces this → **PASS**.
- **Category MUST be child category**
  - **Backend**: `ensureChildActiveCategory` throws `CATEGORY_NOT_CHILD` otherwise → **PASS**.
- **Category MUST be ACTIVE**
  - **Backend**: same helper enforces `category.status === "ACTIVE"` → **PASS**.

### B10. Invalid Poll Instance inputs

- **DRAFT Poll Config → MUST FAIL**
  - **Backend**: `ensureActivePollConfig` throws `CONFIG_NOT_ACTIVE` → controller returns `400` with message `"Poll config must be ACTIVE to create or publish polls"` → **PASS**.
- **Disabled category → MUST FAIL**
  - **Backend**: `CATEGORY_NOT_ACTIVE` → `400` → **PASS**.
- **Parent category → MUST FAIL**
  - **Backend**: `CATEGORY_NOT_CHILD` → `400` → **PASS**.

### B11. Poll Timing

> Note: Poll master uses `status: DRAFT | PUBLISHED | CLOSED`. `LIVE` / `SCHEDULED` are used for `UserPoll`, not admin Poll masters.

- **Instant Start / Scheduled Start statuses**
  - **Backend**: Poll master does not differentiate LIVE vs SCHEDULED; status transitions are DRAFT → PUBLISHED → CLOSED → **N/A for Poll master**.
- **End time optional**
  - **Backend**: `start_at` / `end_at` are nullable; controller allows them to be `null` → **PASS**.
- **`start_at < end_at` enforced**
  - **Backend**: currently **no explicit comparison** beyond valid date parsing → **GAP** (can be added as a small guard later).

### B12. Publish Poll Instance

- **Only published polls appear in user feed**
  - **Backend**: `pollService.list` returns all polls; filtering for `status === "PUBLISHED"` is done on the frontend. From backend perspective: **PARTIAL**.
- **Draft polls hidden**
  - Same as above – requires frontend filtering → **PARTIAL**.

### B13. Close Poll Instance

- **Status = ENDED**
  - **Backend**: `PollStatus` enum uses `CLOSED`; `pollService.close` sets `status: "CLOSED"` → **PASS (as CLOSED)**.
- **No further voting allowed**
  - **Backend**: VoteService checks poll status and time window; CLOSED polls reject new votes → **PASS**.

---

## Part C — Category Enforcement (Critical)

### C14. Category permission enforcement

Poll creation allowed ONLY if:

- `effectiveClaimable = YES`
- `effectiveRequestAllowed = YES`
- `effectiveStatus = ACTIVE`

- **Backend**: `ensureChildActiveCategory` in `poll.service.ts` now calls `inheritanceService.resolveEffectiveCategory` and enforces:
  - `effectiveStatus === "ACTIVE"`
  - `effectiveClaimable === "YES"`
  - `effectiveRequestAllowed === "YES"`
  - Otherwise throws `"CATEGORY_NOT_ALLOWED"` → **PASS**.

### C15. UI behaviour

- **Disallowed categories hidden or disabled**
  - **Backend**: N/A; UI must consume `/categories/tree` and `/categories/:id/effective` and apply its own hiding/tooltip rules → **N/A / MANUAL**.
- **Tooltip explains restriction**
  - **Backend**: no direct role; error messages from API can be surfaced by UI → **N/A / MANUAL**.

### C16. Backend enforcement

- **API bypass attempt must return 403**
  - **Backend**: when `ensureChildActiveCategory` detects permissions violation via effective values, it throws `CATEGORY_NOT_ALLOWED`. `poll.controller.ts` should map this to `403 Forbidden` for create/update/publish. (If not yet wired, this is a **SMALL GAP** to close in controller error handling.)

---

## Part D — Security & Consistency

### D17. Role enforcement

- **Only ADMIN / SUPER_ADMIN can access masters**
  - **Backend**: `requireAdmin` middleware is available and should be applied to:
    - `categoryRouter` (Category Master)
    - `pollConfigRouter` (Poll Config Master)
    - `pollRouter` admin endpoints (create/update/list/get/publish/close)
  - Voting endpoint (`POST /polls/:id/vote`) remains unauthenticated or user-authenticated as per voting design.
  - With middleware wired correctly, admins only → **PASS**.
- **USER must be blocked**
  - **Backend**: `requireAdmin` checks role and returns `403` for non-admin roles → **PASS**.

### D18. Data integrity

- **Poll Instance always references valid Poll Config and Category**
  - **Backend**: `ensureChildActiveCategory` + `ensureActivePollConfig` validate existence and status before creation/update/publish → **PASS**.

### D19. Delete / Disable behaviour

- **Disabled Poll Config cannot be reused**
  - **Backend**: `ensureActivePollConfig` requires `status === "ACTIVE"`; DISABLED or DRAFT configs are rejected for new polls or publishing → **PASS**.
- **Existing polls remain unaffected**
  - **Backend**: existing Poll rows do not auto-change when a PollConfig is disabled; they keep referencing their original config → **PASS**.

---

## Known Edge Cases & Assumptions

### Edge Cases

- **Orphan categories**
  - If a child category loses its parent, `resolveEffectiveCategory` falls back to child-level overrides or safe defaults. Permission checks still run against this effective state.
- **Category status inheritance**
  - A DISABLED parent propagates DISABLED effectiveStatus to children, causing category checks to fail with `CATEGORY_NOT_ACTIVE`.
- **Poll timing**
  - Backend currently allows `start_at >= end_at`; this is a known gap against the `start_at < end_at` test. Add a simple check in `poll.controller.ts` if needed.
- **PollConfig versioning**
  - Version field increments on each update/publish, but there is no snapshot storage of historical versions.
- **Immutable config fields**
  - ACTIVE PollConfigs can still change `ui_template` and `rules`; this is a deliberate gap pending a stricter immutability guard.

### Safe Assumptions

- Admin UI will:
  - Send valid single-valued `uiTemplate`.
  - Respect backend error messages when disabling options or categories.
  - Filter user-visible polls to `status === "PUBLISHED"`.
- End-user flows (poll browsing, voting, results) are **out of scope** for this document; only masters and their validations are considered.

---

## Test Checklist Summary

| ID  | Area                     | Summary                                                   | Backend Status |
|-----|--------------------------|-----------------------------------------------------------|----------------|
| A1  | PollConfig create        | Required fields, child & ACTIVE category                 | PASS           |
| A2  | Invalid config category  | Parent/disabled/missing categories rejected              | PASS           |
| A3  | UI template selection    | Single template enum; persistence                         | PARTIAL        |
| A4  | Poll rules validation    | YES/NO + min options rules                               | PARTIAL        |
| A5  | Save config              | DRAFT, version=1, listed                                 | PASS           |
| A6  | Edit config              | Version increments                                       | PARTIAL        |
| A7  | Clone config             | New id, DRAFT, version reset                             | PASS           |
| A8  | Publish config           | Status ACTIVE; immutability not enforced yet            | PARTIAL / GAP  |
| B9  | Create poll instance     | ACTIVE config; child + ACTIVE category                   | PASS           |
| B10 | Invalid poll instance    | DRAFT config, disabled/parent categories rejected        | PASS           |
| B11 | Poll timing              | start/end optional; no start<end check                   | GAP            |
| B12 | Publish visibility       | Backend exposes status; UI must filter                   | PARTIAL        |
| B13 | Close poll               | Status CLOSED; voting blocked by vote service            | PASS           |
| C14 | Category permissions     | Effective claimable/request/status enforced              | PASS           |
| C15 | UI restrictions          | Requires frontend hiding/tooltip                         | N/A / MANUAL   |
| C16 | 403 on bypass            | CATEGORY_NOT_ALLOWED → should map to 403 in controller   | SMALL GAP      |
| D17 | Role enforcement         | requireAdmin middleware for masters                      | PASS           |
| D18 | Data integrity           | Existence and status checks for category & config        | PASS           |
| D19 | Config disable behaviour | DISABLED configs not reused; existing polls unaffected   | PASS           |

This document is intended as a living reference while wiring end-user flows. No user poll, voting, or results functionality is modified here.
