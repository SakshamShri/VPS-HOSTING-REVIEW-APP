# User Poll Owner Share Link

This step adds a **generic, shareable poll link** for end users who create invite-only polls. The goal is to let a poll owner share a single URL anywhere (outside WhatsApp) while still enforcing the existing **invite** and **one-vote-per-person** rules.

We **do not** create public polls, anonymous votes, or bypass the invite acceptance flow.

---

## Concepts

- **User poll**: Invite-only poll created by an end user via `/polls/create`. Backed by `UserPoll` and `UserPollInvite` models.
- **Direct invite link**: WhatsApp-style link generated per mobile number (unique invite token in query).
- **Owner share link**: A generic link that the poll owner can share anywhere:

  ```text
  /polls/:pollId?ref=owner
  ```

  This does **not** grant direct voting access. Instead, it dynamically creates (or reuses) a `UserPollInvite` for the visiting, logged-in user, then sends them through the existing invite acceptance flow.

---

## Backend Behavior

### 1. Creating an Owner Invite

New service method:

- File: `backend/src/services/userPoll.service.ts`
- Method: `createOwnerInviteForUser(userId: bigint, pollId: bigint)`

Logic:

1. Load `UserPoll` by `pollId`.
2. Enforce that:
   - The poll exists.
   - `poll.status === "LIVE"`.
   - `poll.is_invite_only === true`.
3. Look for an existing `UserPollInvite` for this `(pollId, userId)` pair.
   - If found with status **not** `REJECTED`, reuse it and return its `token`.
4. Otherwise, create a new `UserPollInvite`:

   ```ts
   const token = randomUUID();
   await prisma.userPollInvite.create({
     data: {
       poll_id: pollId,
       user_id: userId,
       mobile: `user:${userId.toString()}`,
       token,
       status: "PENDING",
     },
   });
   ```

5. Return `{ token }` to the caller.

This keeps **one logical invite per user per poll**, unless they previously rejected and we intentionally reissue.

### 2. New Endpoint: `POST /user/polls/:id/owner-invite`

- File: `backend/src/controllers/userPoll.controller.ts`
- Handler: `createUserPollOwnerInviteHandler`

Behavior:

1. Requires `req.user` (via `requireUser` in routes).
2. Reads `:id` from the path and converts to `BigInt`.
3. Calls `userPollService.createOwnerInviteForUser(req.user.id, pollId)`.
4. Returns:

   ```json
   { "token": "..." }
   ```

5. Error handling:
   - `POLL_NOT_FOUND` → 404 `Poll not found`.
   - `POLL_NOT_LIVE` → 400 `Poll is not live`.
   - `POLL_NOT_INVITE_ONLY` → 400 `Poll is not invite-only`.
   - All others → 500 `Failed to create owner invite`.

**Route wiring**:

- File: `backend/src/routes/user.routes.ts`

```ts
userRouter.post("/user/polls/:id/owner-invite", requireUser, createUserPollOwnerInviteHandler);
```

This keeps owner-share logic entirely on the **user poll** side and behind authenticated user access.

### 3. Ref=owner Handling on Voting Page

We keep the core voting endpoint `/polls/:id` and `submitVote` logic **unchanged**. Instead, we intercept owner share links in the frontend and route them into the existing invite flow.

Owner link format:

```text
/polls/:pollId?ref=owner
```

When this is opened in the browser:

1. `PollVotePage` reads `ref` from `useSearchParams()`.
2. If `ref === "owner"`, it **does not** load the public poll config.
3. Instead, it calls `createOwnerInvite(pollId)` (frontend API below), which:
   - Calls `POST /user/polls/:id/owner-invite` with the current user JWT.
   - Receives an invite `token`.
4. The page then redirects to the existing invite landing route:

   ```ts
   navigate(`/invites/${token}`, { replace: true });
   ```

5. The rest is handled by `InviteLandingPage` and the `/invites/*` backend:
   - `/invites/validate` checks the invite and poll status.
   - `/invites/accept` marks the invite as `ACCEPTED` for the user.
   - The user can then follow existing flows to reach the voting UI with `?invite=...` where needed.

If the user is **not logged in**, the owner-invite API returns 401, which the frontend treats as `AUTH_REQUIRED:` and redirects to `/login`. After login, they can click the share link again.

---

## Frontend Behavior

### 1. API: `createOwnerInvite`

- File: `frontend/src/api/userPoll.api.ts`

```ts
export async function createOwnerInvite(pollId: string): Promise<{ token: string }> {
  const authToken = localStorage.getItem("authToken");

  const res = await fetch(`${API_BASE}/user/polls/${pollId}/owner-invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 401) {
      throw new Error("AUTH_REQUIRED:" + (data.message || "Please log in to continue"));
    }
    throw new Error(data.message || `Failed to create owner invite (${res.status})`);
  }

  const data = (await res.json()) as { token: string };
  return data;
}
```

### 2. Owner Share Link After Poll Creation

In the **end-user poll creation wizard**:

- File: `frontend/src/pages/UserPollCreatePage.tsx`

After `createUserPoll` and `createUserPollInvites` succeed, we build a share link:

```ts
setCreatedInvites(invites);

// Build generic owner share link: /polls/:pollId?ref=owner
const baseUrl = window.location.origin;
setShareLink(`${baseUrl}/polls/${poll.id}?ref=owner`);
```

In the final (publish) step, we show a **Share poll link** section:

```tsx
{shareLink && (
  <div className="space-y-2 rounded-xl border bg-card p-3">
    <p className="text-xs font-semibold">Share poll link</p>
    <p className="text-[11px] text-muted-foreground">
      Share this poll link anywhere. People will be asked to log in and accept the invitation.
    </p>
    <div className="flex gap-2">
      <Input readOnly value={shareLink} className="text-[11px] font-mono" />
      <Button
        type="button"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(shareLink).catch(() => {
            // ignore clipboard errors
          });
        }}
      >
        Copy
      </Button>
    </div>
  </div>
)}
```

The existing **WhatsApp links** section remains unchanged, showing per-recipient links built from the original `UserPollInvite` entries.

### 3. PollVotePage owner redirect

- File: `frontend/src/pages/PollVotePage.tsx`

Key behavior:

```tsx
const [searchParams] = useSearchParams();
const navigate = useNavigate();

useEffect(() => {
  if (!id) return;

  const ref = searchParams.get("ref");
  if (ref === "owner") {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const { token } = await createOwnerInvite(id);
        if (cancelled) return;
        navigate(`/invites/${token}`, { replace: true });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          const message = (err as Error).message || "Failed to open poll invite.";
          if (message.startsWith("AUTH_REQUIRED:")) {
            setError(message.replace("AUTH_REQUIRED:", ""));
            navigate("/login", { replace: true });
          } else {
            setError(message);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }

  // Normal poll voting fetch remains unchanged
  ...
}, [id, navigate, searchParams]);
```

This keeps the **poll voting logic and payload** untouched; we only add a pre-step for owner links.

---

## Owner Share Link vs Direct Invite Links

### Owner Share Link

- Format: `/polls/:pollId?ref=owner`
- Who sees it: The poll creator (end user) after publishing.
- How it works:
  1. Viewer opens the link.
  2. Frontend calls the owner-invite endpoint with their user token.
  3. Backend creates (or reuses) a `UserPollInvite` for `(pollId, userId)`.
  4. Viewer is redirected to `/invites/:token` and uses the normal accept/reject flow.

### Direct Invite Links (WhatsApp)

- Format: `https://wa.me/...` with `?text=` pointing to `.../polls/:pollId?invite=:token`.
- One per **mobile number**.
- Already in place before this step; unchanged.

### Why both are needed

- **Direct links** are ideal for targeted messaging (e.g., WhatsApp blasts) and encode a specific invite.
- The **owner share link** is for generic sharing (e.g., posting in a group, sending to someone ad hoc) where you dont know the mobile number in advance.

Both converge on the same `UserPollInvite` mechanism under the hood.

---

## Security Guarantees

1. **No public polls**
   - Owner share link does not expose a public voting endpoint.
   - It simply triggers creation of a `UserPollInvite` tied to the logged-in user.

2. **Invite acceptance is still required**
   - The share link routes users into `/invites/:token`.
   - They must accept the invite (via `POST /invites/accept`) using their authenticated user account.

3. **One invite → one vote (per user/poll)**
   - Each user gets at most one active invite per poll (we reuse existing invites when possible).
   - The existing invite + voting logic enforces that each invite can be accepted/used only once.

4. **Poll must be LIVE**
   - `createOwnerInviteForUser` checks `poll.status === "LIVE"`.
   - Non-live polls cannot generate owner invites via this endpoint.

5. **Authentication required**
   - `POST /user/polls/:id/owner-invite` is protected by `requireUser`.
   - If a visitor is not logged in, the frontend handles the `AUTH_REQUIRED` signal and redirects to `/login`.

---

## Summary

- **Owner share link**: `/polls/:pollId?ref=owner`.
- Backend:
  - New `createOwnerInviteForUser` service and `POST /user/polls/:id/owner-invite` endpoint.
  - Enforces LIVE, invite-only polls and creates/reuses `UserPollInvite` rows.
- Frontend:
  - `UserPollCreatePage` shows a copyable share link after successful publish.
  - `PollVotePage` intercepts `ref=owner`, calls the owner-invite endpoint, and redirects to `/invites/:token`.
- Existing invite validation, acceptance, and voting flows remain unchanged, preserving security and one-vote-per-person semantics.
