# Step 13B – Invitation Acceptance for Invite-Only Polls

This step adds **secure invitation acceptance** for invite-only user polls created in Step 13A.
Participants can accept or reject poll invitations via unique links. No voting or results are
implemented here.

---

## Invite Lifecycle

1. **Creation (Step 13A)**
   - When a user publishes an invite-only poll, the backend creates `UserPollInvite` rows, each
     with a unique `token` and associated `mobile` number.
   - For each invite, the frontend receives a WhatsApp link of the form:

     ```text
     https://wa.me/<number>?text=<encoded message>
     ```

   - The message includes the poll title, short description, and a direct poll link with the
     invite token as a query parameter.

2. **Distribution**
   - The poll creator manually shares these WhatsApp links with participants.
   - Each invite token is intended to be **one-time use**.

3. **Landing**
   - When a participant opens the link, the frontend navigates to:

     ```text
     /invites/:token
     ```

   - The frontend calls `GET /invites/validate?token=...` to fetch poll summary information for
     display.

4. **Acceptance / Rejection**
   - After reviewing the invitation, the participant can choose to **accept** or **reject** it.
   - These actions are recorded in the backend but do not yet start any voting flow.

---

## Backend APIs

### 1. Validate Invite

```http
GET /invites/validate?token=XYZ
```

- **Purpose**: Check whether an invite token is valid and return a minimal poll summary for
  preview.
- **Auth**: No authentication required (read-only preview).
- **Validation rules**:
  - Token must exist.
  - Invite status must be `PENDING`.
  - Linked poll must exist and be in `LIVE` or `SCHEDULED` status.
- **Response** (simplified):

  ```json
  {
    "poll": {
      "pollId": "123",
      "type": "SINGLE_CHOICE",
      "title": "...",
      "description": "...",
      "status": "LIVE" | "SCHEDULED",
      "start_at": "2025-01-01T10:00:00.000Z",
      "end_at": "2025-01-01T12:00:00.000Z"
    }
  }
  ```

### 2. Accept Invite

```http
POST /invites/accept
Content-Type: application/json
Authorization: Bearer <JWT>

{ "token": "XYZ" }
```

- **Auth**: `requireUser` (login required; only `USER` role can accept).
- **Logic**:
  - Validate token as in `/invites/validate`.
  - In a transaction:
    - Ensure invite status is still `PENDING`.
    - Ensure the poll is `LIVE` or `SCHEDULED`.
    - Update `UserPollInvite`:
      - `status = ACCEPTED`
      - `user_id = current user id`
- **One-time usage**:
  - Subsequent accept/reject calls for the same token fail with
    `INVITE_ALREADY_USED` and return HTTP 400.

### 3. Reject Invite

```http
POST /invites/reject
Content-Type: application/json
Authorization: Bearer <JWT>

{ "token": "XYZ" }
```

- **Auth**: `requireUser` (login required).
- **Logic**:
  - Same validation as accept (must be `PENDING`, poll active).
  - Update `UserPollInvite`:
    - `status = REJECTED`
  - `user_id` is not required for rejection; the system only records that the token was
    explicitly declined.

### Data Model Changes

`UserPollInvite` gains additional fields and an enum:

```prisma
enum UserPollInviteStatus {
  PENDING
  ACCEPTED
  REJECTED
}

model UserPollInvite {
  id         BigInt   @id @default(autoincrement())
  poll_id    BigInt
  poll       UserPoll @relation(fields: [poll_id], references: [id])
  mobile     String   @db.VarChar(32)
  token      String   @unique
  user_id    BigInt?
  user       User?    @relation(fields: [user_id], references: [id])
  status     UserPollInviteStatus @default(PENDING)
  created_at DateTime @default(now())
}
```

All new invites created in Step 13A are now stored with `status = PENDING`.

---

## Frontend Flow

### Route

- **`/invites/:token`** – Invitation landing page.

This page:

1. Extracts `token` from the URL.
2. Calls `GET /invites/validate?token=...` to retrieve poll summary.
3. Shows:
   - Poll title and description.
   - Current poll status (Live / Scheduled).
   - If `status = SCHEDULED`, a **countdown** until `start_at`.
4. Provides two primary actions:
   - **Accept invite** → `POST /invites/accept`.
   - **Reject invite** → `POST /invites/reject`.

### Login Requirement

- The accept and reject calls include the JWT from `localStorage` in the
  `Authorization: Bearer` header.
- If the backend responds with `401 Unauthorized`, the frontend:
  - Shows a message indicating that login is required.
  - Provides a link to the existing `/login` page.
- The login flow itself is **unchanged**; participants can log in as usual and then revisit the
  invite link.

Once an invite is accepted or rejected successfully, the landing page shows a confirmation
message and disables further actions.

---

## Security Guarantees

1. **One-time token usage**
   - Each invite token is tied to a `UserPollInvite` row.
   - `ACCEPTED` or `REJECTED` tokens cannot be used again; the backend returns a 400 error.

2. **Poll must be active**
   - Invites are only valid if the associated poll is in `LIVE` or `SCHEDULED` state.
   - This prevents accepting invites for closed or invalidated polls.

3. **Login is required for state changes**
   - `/invites/accept` and `/invites/reject` are protected by `requireUser` middleware.
   - This links acceptance to a specific `user_id` and avoids anonymous state changes.

4. **Limited exposure of poll data**
   - `/invites/validate` returns only a minimal summary needed for the preview and countdown.
   - No voting configuration or results are exposed.

---

## Out of Scope (Non-Goals)

- No voting endpoints or UI are added in this step.
- No poll results, analytics, or dashboards are implemented.
- No device or geolocation restrictions are enforced for invites.

Step 13B focuses solely on **accepting or rejecting** invite-only poll invitations in a secure,
one-time manner, laying the groundwork for future voting flows.
