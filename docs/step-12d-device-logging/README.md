# Step 12D – Device Logging on Login

This step adds **device-level logging** for every successful login, without changing any login flows or blocking users. The goal is to build a security and audit trail of which devices are accessing accounts.

---

## What Is Logged

A new `DeviceLog` table is introduced in the database:

- `id` – primary key
- `user_id` – numeric identifier of the subject (can be a User or Admin, depending on role)
- `role` – one of `SUPER_ADMIN`, `ADMIN`, `USER`
- `ip_address` – best-effort IP address at time of login
- `user_agent` – raw User-Agent string from the HTTP request
- `device_type` – parsed device type (`desktop`, `mobile`, `tablet`, etc.)
- `os` – parsed operating system name and version (e.g. `Windows 11`, `Android 14`)
- `browser` – parsed browser name and version (e.g. `Chrome 129.0`)
- `is_new_device` – boolean flag indicating whether this login appears to be from a **new device profile** for this user and role
- `created_at` – timestamp when the log entry was created

### Source of Data

- `ip_address` is derived from `X-Forwarded-For` (if present) or `req.ip` / `socket.remoteAddress` as a fallback.
- `user_agent`, `device_type`, `os`, and `browser` are inferred from the HTTP `User-Agent` header using `ua-parser-js`.

No login behavior or UI is changed. All logic runs **after** a successful login and failures in logging are swallowed (best-effort only).

---

## Why IP Is Not Used for Fingerprinting

IP addresses are highly variable and often shared:

- Mobile networks, VPNs, corporate proxies, and NAT can cause the same person to appear from many IPs, or many people to share one IP.
- Treating IP changes as new devices leads to noisy, low-quality signals and potential privacy concerns.

For that reason, the `is_new_device` calculation **ignores IP changes entirely** and focuses on a combination of:

- `user_id`
- `role`
- `device_type`
- `os`
- `browser`

This gives a more stable notion of a "device profile" while avoiding using IP as a fingerprinting key.

IP is still stored as context for audits (e.g. incident review), but not used to determine whether the device is new.

---

## How New Devices Are Detected

On each successful login, the backend:

1. Parses the current request’s `User-Agent` with **ua-parser-js** to obtain:
   - `device_type` (e.g. `desktop`, `mobile`)
   - `os` (name + version where available)
   - `browser` (name + version where available)

2. Looks for an existing `DeviceLog` row with the same:
   - `user_id`
   - `role`
   - `device_type`
   - `os`
   - `browser`

3. If no such record exists, the login is considered to be from a **new device** and `is_new_device` is set to `true` for the new row. Otherwise, `is_new_device` is `false`.

This logic is the same for all roles, including `SUPER_ADMIN`, `ADMIN`, and `USER`.

---

## Where Device Logging Happens

Device logging is wired into the existing authentication flow in the backend only. The frontend is not modified.

### 1. Admin & Super Admin Login

For `POST /auth/admin/login`:

- After verifying username/password via `AuthService.adminLogin`, the controller:
  - Loads the `AdminCredentials` row.
  - Calls `logDeviceLogin(req, { userId: admin.id, role: admin.role })`.
- A `DeviceLog` record is inserted with `role = "SUPER_ADMIN"` or `"ADMIN"` depending on the admin’s role.

### 2. User OTP Login

For `POST /auth/otp/verify`:

- After verifying the OTP and creating/finding the `User` record, the controller:
  - Calls `logDeviceLogin(req, { userId: user.id, role: user.role })`.
- A `DeviceLog` record is inserted with `role = "USER"`.

If `logDeviceLogin` fails for any reason (e.g. parser error, DB issue), the error is logged to the server console and the login still succeeds.

---

## Library Used: ua-parser-js

The backend uses [`ua-parser-js`](https://github.com/faisalman/ua-parser-js) to interpret the `User-Agent` header. From a single string it extracts structured information about:

- **Device**: type (mobile, tablet, desktop, etc.)
- **OS**: name and version
- **Browser**: name and version

This avoids hand-rolling fragile regexes and provides consistent parsing across many client types.

---

## Future Extensions

This device logging foundation enables several future enhancements without changing today’s login behavior:

- **Suspicious login alerts**
  - Notify users when a login occurs from a new device profile or unusual location.
- **Device management UI**
  - Allow users or admins to review past devices and revoke sessions.
- **Risk-based authentication**
  - Combine device history with geo and behavior signals to step up auth (e.g. require OTP again).
- **Audit reporting**
  - Provide security teams with a timeline of access patterns for investigations.

For now, Step 12D keeps things intentionally simple: it only **records** device information at login for all roles, with no blocking, no alerts, and no frontend changes.
