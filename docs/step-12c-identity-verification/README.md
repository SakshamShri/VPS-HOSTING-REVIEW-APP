# Step 12C – Optional Identity Verification & User Profile

This step adds **optional** identity verification and a lightweight user profile flow on top of the authentication system. Verification is encouraged but **never blocks access** if the user chooses to skip it.

## Goals

- Allow users to optionally verify their identity using a country-specific document number.
- Support **India (Aadhaar)** and **Brazil (CPF)** with local, checksum-only validation.
- Let users complete a basic profile and mark their account as **verified** once both identity and profile are in place.
- Keep verification fully optional: users can always **"Skip for now"** and continue using the app.

---

## Backend Changes

### Database

The `User` model in Prisma gains an additional flag:

- `identity_verified: Boolean @default(false)`

The existing `is_verified` flag is used to represent **full verification** (identity + profile completed).

- `identity_verified = true` → identity document number has passed checksum validation.
- `is_verified = true` → user has a saved profile **and** `identity_verified` is true.

No poll-related tables or logic are changed in this step.

### Identity Validation Algorithms

All validation is done **locally** – there are **no external API calls**.

#### 1. Aadhaar (India) – Verhoeff Algorithm

For `country = "INDIA"`, we treat the `id_number` as a 12‑digit Aadhaar number. The last digit is a checksum computed using the **Verhoeff algorithm**.

Implementation details:

- Normalize by removing whitespace and ensure it is exactly 12 digits.
- Use the Verhoeff `d` and `p` tables.
- Process digits from right to left and compute the checksum accumulator `c`.
- The Aadhaar number is accepted if and only if `c === 0`.

This catches most common typos without calling any government systems.

#### 2. CPF (Brazil) – CPF Checksum

For `country = "BRAZIL"`, we treat the `id_number` as an 11‑digit **CPF**.

Implementation details:

- Strip all non-digits and ensure it is exactly 11 digits.
- Reject CPFs where all digits are the same (e.g. `00000000000`).
- Compute the **first check digit** using weighted sum (10 down to 2) and `(sum * 10) % 11` logic.
- Compute the **second check digit** using weights (11 down to 2).
- Accept only when both calculated check digits match the last two digits.

Again, this is purely local checksum validation.

### Endpoints

#### `POST /auth/verify-identity`

**Payload:**

```json
{
  "country": "INDIA" | "BRAZIL",
  "id_number": "string"
}
``

**Behavior:**

- Requires an authenticated **USER** (JWT with role `USER`) via `requireUser` middleware.
- Validates the payload shape with Zod.
- For `INDIA`, runs the Verhoeff Aadhaar check.
- For `BRAZIL`, runs the CPF checksum check.
- On success:
  - Sets `user.identity_verified = true`.
  - Responds with:
    ```json
    { "identity_verified": true }
    ```
- On invalid ID number:
  - Responds with `400` and `{ "message": "Invalid identity number" }`.

This endpoint **does not** affect `is_verified` directly; that happens when the profile is saved.

#### `POST /user/profile`

**Payload:**

```json
{
  "name": "string",
  "age": number,
  "address": "string | null",
  "current_location": "string | null",
  "permanent_address": "string | null"
}
```

**Behavior:**

- Requires an authenticated **USER** via `requireUser` middleware.
- Validates the payload with Zod (name required, age coerced to a number within a safe range).
- Upserts the corresponding `UserProfile` record.
- Reloads the user row:
  - If `identity_verified === true` and `is_verified === false`, it sets `is_verified = true`.
- Responds with:
  ```json
  { "is_verified": true | false }
  ```

This means:

- If identity verification happened **before** or **after** profile completion, the user eventually becomes fully verified (`is_verified = true`) once **both** are satisfied.
- No other routes are gated by `is_verified` – verification remains optional.

### Middleware

Both endpoints rely on the existing JWT middleware:

- `requireUser` → validates JWT, ensures `role === "USER"`, and populates `req.user.id` (BigInt) and `req.user.role`.

CORS is configured to allow the `Authorization` header so the frontend can send `Bearer` tokens.

---

## Frontend Changes

Two new mobile-first pages are added for end users. These pages assume a JWT token is stored in `localStorage` as `authToken` and send it as a Bearer token, but they do **not** change any existing login behavior.

### `/user/verify` – Identity Verification Screen

Key UI elements:

- **Country selector** – dropdown with:
  - `India (Aadhaar)` → `INDIA`
  - `Brazil (CPF)` → `BRAZIL`
- **ID input field** – label dynamically switches between *Aadhaar number* and *CPF number*.
- **Helper text** – clarifies that only checksums are validated and no external APIs are used.
- **Primary button** – “Verify and continue”:
  - Calls `POST /auth/verify-identity` with `{ country, id_number }` and the JWT in the `Authorization` header.
  - Shows inline error text on failure.
  - On success, shows a compact **“Identity verified”** badge.
- **Secondary action** – “Skip for now”:
  - Navigates back in history without blocking the user.

Layout:

- Centered card on a muted background.
- Single-column, touch-friendly controls optimized for small screens.

### `/user/profile` – Profile Completion Screen

Key UI elements:

- **Name** – text input.
- **Age slider** – range input from 18 to 100 with current value displayed.
- **Address** – multiline textarea.
- **Current location** – single-line input, e.g. “City, country”.
- **Permanent address** – multiline textarea.
- **Primary button** – “Save & Finish”:
  - Calls `POST /user/profile` with the above fields.
  - Shows inline error text on failure.
  - On success, shows a subtle confirmation message and updates the **Verified badge** based on `is_verified`.
- **Secondary action** – “Skip for now”:
  - Navigates back in history without blocking access.

Verified state:

- When the backend responds with `is_verified: true`, a **“Verified”** chip appears in the header of the profile card.
- This visually distinguishes users who have both:
  - Passed identity verification, and
  - Saved a profile.

No existing admin or poll pages are modified; these are **new user-facing pages** only.

---

## Why Verification Is Optional

Design decisions for this step:

- **No hard gatekeeping** – Users can always choose **“Skip for now”** on both the verification and profile screens and continue using the app.
- **Progressive trust** – Verification is a way to build additional trust and attach a government ID pattern-validated number to a profile without forcing it.
- **Local-only verification** – Using checksums (Verhoeff and CPF) avoids privacy issues and dependencies on external government APIs.

This keeps the experience inclusive while still enabling a stronger notion of a “verified” user for future governance or reputation use cases.

---

## Summary

- Added `identity_verified` to `User` and wired Aadhaar (Verhoeff) and CPF checksum validation.
- Implemented two backend endpoints:
  - `POST /auth/verify-identity` – marks `identity_verified` on success.
  - `POST /user/profile` – upserts profile and toggles `is_verified` when identity is verified.
- Introduced `/user/verify` and `/user/profile` pages with mobile-first, card-based UI, clear **“Skip for now”** paths, and a **Verified** badge after completion.
- Left login behavior and all poll logic untouched, in line with the step’s scope.
