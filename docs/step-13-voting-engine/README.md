# Step 13 – Voting Engine

This step introduces the **voting engine** for published polls. It focuses only on **capturing votes** with strict rule enforcement. Results aggregation and analytics are intentionally out of scope.

---

## Goals

- Allow users to submit responses to **published** polls.
- Enforce **one vote per user or invite** per poll.
- Use the **Poll Config DNA** (template + rules) to validate incoming responses.
- Support both authenticated users and invite-based participants.

---

## Database Model

### `Vote` table

A new `Vote` model is added to the Prisma schema:

- `id` – `BigInt`, primary key.
- `poll_id` – FK → `Poll.id`.
- `poll_config_id` – FK → `PollConfig.id` (at the time of voting).
- `user_id` – FK → `User.id`, nullable.
- `invite_id` – FK → `Invite.id`, nullable.
- `response` – `Json`, stores the raw response payload.
- `created_at` – timestamp.

Constraints:

- `@@unique([poll_id, user_id])` – a **user** can vote only once per poll.
- `@@unique([poll_id, invite_id])` – an **invite** can be used only once per poll.

At least one of `user_id` or `invite_id` is always enforced by service logic for every vote, so there are **no anonymous votes**.

### `Invite` table

A minimal `Invite` model is introduced:

- `id` – `BigInt`, primary key.
- `poll_id` – FK → `Poll.id`.
- `token` – unique string used as `invite_token` in the API.
- `created_at` – timestamp.

Each invite can be used exactly once per poll, enforced by the unique `(poll_id, invite_id)` constraint on `Vote`.

> Note: This step focuses on using invites, not on building invite management UIs.

---

## Backend API

### Endpoint: `POST /polls/:id/vote`

**Request body:**

```json
{
  "response": { "any": "json" },
  "invite_token": "optional-string"
}
```

**Authentication options:**

- **Authenticated user**: sends a valid JWT in `Authorization: Bearer <token>`.
- **Invite-based user**: omits auth but provides a valid `invite_token` tied to the poll.

The service enforces:

- If the poll's Poll Config has `permissions.inviteOnly === true`, a **valid invite token is required**, even for authenticated users.
- Otherwise, **either** a valid JWT **or** a valid invite token is required.

### Service Logic

The vote service (`VoteService`) performs the following checks:

1. **Poll existence and status**
   - Loads the poll and associated `pollConfig`.
   - Ensures `poll.status === "PUBLISHED"`.
   - If not, returns `400` – "Poll is not open for voting".

2. **Invite validation (when present/required)**
   - If `invite_token` is present:
     - Looks up `Invite` by token.
     - Ensures it exists and `invite.poll_id === poll.id`.
     - Otherwise returns `400` – "Invalid invite token".
   - If Poll Config `permissions.inviteOnly === true` and no valid invite is found:
     - Returns `401` – "Invite token required for this poll".

3. **Auth / invite requirement**
   - If `inviteOnly` is **false** and neither user nor invite is present:
     - Returns `401` – "Authentication or invite token required".

4. **Duplicate vote prevention**
   - If `user_id` is present:
     - Checks for an existing vote with the same `(poll_id, user_id)`.
   - If `invite_id` is present:
     - Checks for an existing vote with the same `(poll_id, invite_id)`.
   - If such a vote exists, returns `409` – "You have already voted in this poll".

5. **DNA-driven response validation**

The service reads the `pollConfig` JSON fields:

- `ui_template` – defines the poll type (e.g. `YES_NO`, `STANDARD_LIST`, `RATING`).
- `rules.contentRules` – provides `minOptions` / `maxOptions` for selection-based polls.

The validation is deliberately lightweight but grounded in the Poll Config DNA:

- Ensures `response` is a JSON object.
- If `response.selectedOptions` is an array:
  - Enforces `minOptions` / `maxOptions` from `contentRules` (when present).
- For `YES_NO` polls:
  - If `response.choice` is present, it must be either `"YES"` or `"NO"`.
- For `RATING` polls:
  - If `response.value` is present, it must be a number.

If any of these checks fail, the service throws `INVALID_RESPONSE` and the API returns:

- `400` – "Response does not match poll configuration".

6. **Persisting the vote**

After all checks:

- Creates a `Vote` row with:
  - `poll_id` from the URL.
  - `poll_config_id` from the associated `PollConfig`.
  - `user_id` (if authenticated user) or `invite_id` (if invite-based).
  - `response` as provided.

On success, the controller returns:

```json
{ "message": "Vote recorded" }
```

---

## Frontend (User UI)

### API Helper

The frontend `poll.api.ts` adds:

- `fetchPollForVote(id)` – loads a poll for display (title, description, status).
- `submitVote(pollId, response, inviteToken?)` – calls `POST /polls/:id/vote`,
  automatically attaching `Authorization: Bearer <authToken>` when present in `localStorage`.

### Poll Vote Page: `/polls/:id`

A new `PollVotePage` provides a simple, user-facing voting experience:

- Shows poll **title** and **description**.
- Disables inputs when the poll is not `PUBLISHED`.
- Allows the user to:
  - Enter a free-form answer (`response.text`).
  - Optionally paste an invite token.
- On submit:
  - Calls `submitVote`.
  - On success, disables inputs and shows:
    > "Your response has been recorded"

This page is intentionally minimal and does not expose results or analytics.

---

## Security & Rules Summary

- **Auth required or valid invite token**:
  - For non-invite-only polls: either `Authorization` header **or** valid `invite_token` must be provided.
  - For `inviteOnly` polls: a valid `invite_token` is mandatory.
- **Duplicate voting** is prevented via:
  - Service-level checks, plus
  - Database `@@unique` constraints on `(poll_id, user_id)` and `(poll_id, invite_id)`.
- **DNA-driven validation** uses Poll Config:
  - `ui_template` to infer the poll type.
  - `rules.contentRules` for `minOptions` and `maxOptions` on selection arrays.

No result aggregation, analytics, or admin-facing vote dashboards are implemented in this step, in line with the scope.
