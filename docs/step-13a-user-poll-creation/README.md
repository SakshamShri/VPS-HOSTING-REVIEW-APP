# Step 13A – User Poll Creation Wizard (Invite-Only)

This step adds an **end user-facing poll creation wizard** that lets authenticated users create
invite-only polls with basic timing controls. It does **not** add any voting or results logic.

---

## Wizard Overview

Route: `/polls/create`

The wizard is split into 5 steps:

1. **Type**
2. **Details**
3. **Options**
4. **Targeting & Timing**
5. **Publish**

Only users logged in with the `USER` role can access the underlying APIs (enforced on the
backend with `requireUser`). Admin routes remain unchanged.

---

## Step 1 – Type

- The wizard currently supports **Invite-only Campaigns** only.
- **Open Campaign** is shown as a disabled "coming soon" card.
- The user chooses the **poll experience**, which maps to a `UserPollType`:
  - `SINGLE_CHOICE` – one option can be selected
  - `MULTIPLE_CHOICE` – multiple options can be selected
  - `RATING` – rating / NPS-style polls
  - `YES_NO` – binary choice

This choice is stored on the `UserPoll` as `type` and will be used later when voting is added.

---

## Step 2 – Details

Fields:

- **Poll title** (required)
- **Description** (optional)

These map directly to `UserPoll.title` and `UserPoll.description`.

The wizard prevents moving forward until a non-empty title is provided.

---

## Step 3 – Options

The creator configures the answer choices:

- Options can be **added or removed dynamically**.
- A minimum of **two non-empty options** is enforced.
- The **order is preserved** by storing a `display_order` per option.

Data is saved into `UserPollOption` records linked to the poll.

---

## Step 4 – Targeting & Timing

### 4A. Targeting (Invite-Only)

All user polls created in this step are **invite-only**. Participants must receive a unique
invite token to access the poll.

Invitation methods supported:

- **Existing groups** – previously saved collections of mobile numbers.
- **New group** – a new group name and a list of mobile numbers.
- **Individuals** – ad-hoc mobile numbers for a single poll.

The frontend gathers:

- `existing_group_ids` – IDs of selected groups
- `new_group` – `{ name, mobiles[] }` (optional)
- `mobiles` – list of individual numbers

These are sent to `POST /user/polls/:id/invites`, which:

1. Resolves mobiles from every selected existing group.
2. Creates a new `UserInviteGroup` and `UserInviteGroupMember` entries if `new_group` is
   provided.
3. Merges all mobile numbers, normalizes them, and de-duplicates.
4. For each unique mobile:
   - Creates a `UserPollInvite` with a **unique token**.
   - Builds a **WhatsApp link** of the form:

      ```text
      https://wa.me/<number>?text=<encoded message>
      ```

     The message includes:

     - Poll title
     - Optional description
     - A poll URL with the invite token, e.g.

       ```text
       <FRONTEND_BASE_URL>/polls/<pollId>?invite=<token>
       ```

   - Returns these links to the frontend for display and manual sharing.

> Note: Voting endpoints and the invite token consumption logic are **not** implemented in this
> step. Links are generated and stored, but not yet used to record responses.

### 4B. Timing

The creator chooses when the poll should start:

- **Instant start**
  - `startMode = "INSTANT"`
  - Backend sets `status = "LIVE"`.
  - `start_at` is set to the current time on creation.
  - `end_at` is optional.

- **Scheduled start**
  - `startMode = "SCHEDULED"`
  - Backend sets `status = "SCHEDULED"`.
  - `start_at` is required (datetime input in the wizard).
  - `end_at` remains optional.

These values are saved on `UserPoll.start_at` and `UserPoll.end_at` and will drive visibility and
countdown behavior in a later step. For now, they are stored but not enforced anywhere in
frontend or voting logic.

---

## Step 5 – Publish

On Publish, the frontend performs two API calls:

1. **Create poll**

   ```http
   POST /user/polls
   ```

   Body (simplified):

   ```json
   {
     "type": "SINGLE_CHOICE",
     "title": "...",
     "description": "...",
     "options": ["Option 1", "Option 2"],
     "start_mode": "INSTANT" | "SCHEDULED",
     "start_at": "2025-01-01T10:00:00.000Z" | null,
     "end_at": "2025-01-01T12:00:00.000Z" | null
   }
   ```

   The backend:

   - Validates input (including at least two options).
   - Creates a `UserPoll` row with:
     - `creator_id` = current user
     - `type`, `title`, `description`
     - `status` = `LIVE` (instant) or `SCHEDULED` (scheduled)
     - `start_at` / `end_at`
     - `is_invite_only = true`
   - Creates `UserPollOption` rows for each option.

2. **Create invites**

   ```http
   POST /user/polls/:id/invites
   ```

   Body (simplified):

   ```json
   {
     "mobiles": ["+9198..."],
     "existing_group_ids": ["1", "2"],
     "new_group": {
       "name": "VIP customers",
       "mobiles": ["+9198..."]
     }
   }
   ```

   The backend:

   - Resolves all mobile numbers based on the three sources.
   - Creates/updates group data when needed.
   - Inserts `UserPollInvite` rows with unique tokens.
   - Returns an array of invite DTOs:

     ```json
     {
       "invites": [
         {
           "mobile": "+9198...",
           "token": "...",
           "whatsapp_link": "https://wa.me/..."
         }
       ]
     }
     ```

The wizard then displays the WhatsApp links in the final step so the creator can copy and share
them.

---

## Backend Data Model & APIs

### New Prisma Models

The following models are introduced for user-facing polls:

- `UserPoll`
  - `id`, `creator_id`, `title`, `description`
  - `type` (`UserPollType`)
  - `status` (`UserPollStatus`: `DRAFT`, `LIVE`, `SCHEDULED`, `CLOSED`)
  - `is_invite_only` (always `true` in this step)
  - `start_at`, `end_at`, `created_at`, `updated_at`
- `UserPollOption`
  - `poll_id`, `label`, `display_order`
- `UserInviteGroup`
  - `owner_id`, `name`, `created_at`
- `UserInviteGroupMember`
  - `group_id`, `mobile`
- `UserPollInvite`
  - `poll_id`, `mobile`, `token`, `created_at`

These are separate from the existing admin `Poll` and `Invite` models so that the user-facing
flow does not interfere with admin poll instances or the main voting engine.

### APIs

All APIs are under `/user` and protected with `requireUser` middleware (JWT with `role = USER`).

1. `POST /user/polls`
   - Creates a new `UserPoll` and its `UserPollOption` records.
   - Returns `{ id, status, start_at, end_at }`.

2. `POST /user/polls/:id/invites`
   - Valid only for polls where `creator_id` is the current user.
   - Accepts mobiles from existing groups, a new group, and individuals.
   - Creates `UserPollInvite` rows and returns WhatsApp links.

3. `GET /user/groups`
   - Returns a list of groups owned by the current user and their members.

4. `POST /user/groups`
   - Creates a new group with the provided name and mobiles.

Admin routes and schemas are unaffected.

---

## Out of Scope (Non-Goals)

- **No voting endpoints** are added for `UserPoll` yet.
- **No results or analytics** are exposed.
- **No UI** for viewing existing user polls or managing invites.

This step focuses purely on creating user polls, configuring options and timing, and generating
invite links for future voting steps.
