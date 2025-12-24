# Step 13C – Voting with Timer & Invite Rules

This step enables users to **vote on invite-only polls** only when the poll is live and enforces
strict one-vote rules. Voting is anonymous at the API/UI level and no results or analytics are
exposed.

---

## Voting Rules

Voting happens through the existing endpoint:

```http
POST /polls/:id/vote
Content-Type: application/json
Authorization: Bearer <JWT>

{
  "response": {},
  "invite_token": "..."   // optional, but required for invite-only polls
}
```

### Backend Validation

1. **User must be logged in**
   - The controller now **requires** a valid `Authorization: Bearer` header.
   - If the header is missing or the token is invalid, the API returns `401 Authentication required`.

2. **Poll must be live (timer enforcement)**
   - The vote service checks:
     - `status === "PUBLISHED"`.
     - `start_at` is either `null` or **not in the future**.
     - `end_at` is either `null` or **after** the current time.
   - Failures produce:
     - `POLL_NOT_PUBLISHED` → 400 `Poll is not open for voting`.
     - `POLL_NOT_STARTED` → 400 `Poll has not started yet`.
     - `POLL_ENDED` → 400 `Poll has already ended`.

3. **Invite rules**
   - Poll Config permissions can mark a poll as `inviteOnly`.
   - When `inviteOnly` is true:
     - An `invite_token` is required; otherwise `401 INVITE_REQUIRED`.
     - The token must resolve to a valid `Invite` row for that poll; otherwise `400 INVALID_INVITE`.
   - For non-invite-only polls, a logged-in user without token can still vote, but must still pass
     all other validations.

4. **One-vote enforcement**
   - The vote service checks for existing votes before inserting a new one:
     - If a `user_id` is present, it ensures no existing vote for `(poll_id, user_id)`.
     - If an `invite_id` is present, it ensures no existing vote for `(poll_id, invite_id)`.
   - If either check finds a record, the service throws `ALREADY_VOTED` → 409
     `You have already voted in this poll`.

5. **Response validation against poll configuration**
   - The service loads the associated `PollConfig` and:
     - Applies basic selection-count limits (`minOptions` / `maxOptions`) if defined.
     - Performs lightweight type checks based on `ui_template` (e.g. YES/NO choice, numeric
       rating).
   - Invalid payloads result in `INVALID_RESPONSE` → 400
     `Response does not match poll configuration`.

6. **Audit logging**
   - After a successful vote insert, the service writes a console log:

     ```ts
     console.log("[vote] recorded", {
       pollId,
       userId,
       inviteId,
     });
     ```

   - This provides a minimal audit trail without exposing vote content.

---

## Frontend – Timer & State Messages

Voting UI lives at:

```text
/polls/:id
```

The page fetches poll details using `GET /polls/:id` and now also reads `start_at` and `end_at` to
compute a **local voting state**:

- `Not started`
  - Poll status is `DRAFT` or
  - Status is `PUBLISHED` but `now < start_at`.
- `Live`
  - Status is `PUBLISHED`, `start_at` is in the past (or null), and `end_at` is not yet reached.
- `Ended`
  - Status is `CLOSED` or
  - Status is `PUBLISHED` but `now >= end_at`.

The UI shows clear messages:

- **Not started** – “This poll has not started yet.”
- **Live** – “This poll is live. You can vote once.”
- **Ended** – “This poll has ended and is no longer accepting votes.”

The **submit button and inputs are disabled unless the state is `Live`**, and they remain
disabled after a successful vote.

### Invite token from URL

- When visiting a poll via an invite link, the URL includes `?invite=<token>`.
- The voting page reads this query parameter and forwards it as `invite_token` in the
  `/polls/:id/vote` request.
- There is no longer a manual “invite token” text box; the flow relies on the invite link.

---

## Anonymous Voting Guarantee

The system keeps votes anonymous in the following ways:

- The `POST /polls/:id/vote` response returns only a generic success message
  (`{"message":"Vote recorded"}`) and never includes identifying information.
- No public API exposes individual votes or mappings between `user_id`/`invite_id` and
  responses.
- Audit logs record only minimal metadata (`pollId`, optional `userId`, optional `inviteId`) for
  operational debugging.
- Any future results/analytics endpoints (not part of this step) can be implemented to aggregate
  data without exposing per-user responses.

---

## Out of Scope

- No result or analytics endpoints are added.
- No UI is provided to review votes or statistics.
- No changes are made to how invites are created; this step purely governs **when** a vote can be
  cast and how strictly one-vote rules are enforced.
