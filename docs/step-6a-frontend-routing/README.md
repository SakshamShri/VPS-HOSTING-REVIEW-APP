# Step 6a – Frontend Routing for Admin UI

This step finalizes **client‑side routing** so that all Admin UI pages can be reached directly via URLs, without depending on backend routing.

---

## Route Structure

Using React Router v6 with `BrowserRouter`, the main routes are:

- `/dashboard`  
  Renders the **Dashboard** page inside `AdminLayout`.

- `/admin/categories`  
  Renders **PollCategoryMasterPage** (the tree/list view used in Step 2).

- `/admin/categories/new`  
  Renders **CategoryFormPage** in **Create** mode.

- `/admin/categories/:id/edit`  
  Renders **CategoryFormPage** in **Edit** mode (using mock data for now).

- `/`  
  Redirects to `/dashboard`.

- `*`  
  Renders a simple `NotFound` page for unknown routes.

All of these are **purely client‑side** routes managed by React Router.

---

## Layout Routing Pattern

The app uses a single, opinionated shell via `AdminLayout`:

- **File:** `frontend/src/layout/AdminLayout.tsx`
- Provides the fixed **sidebar**, sticky **top bar**, and centered **content card**.

Instead of duplicating layout code per page, each route wraps its page in `AdminLayout`:

```tsx
<Route
  path="/admin/categories"
  element={
    <AdminLayout
      title="Poll Category Master"
      subtitle="Configure the taxonomy that powers your polls."
    >
      <PollCategoryMasterPage />
    </AdminLayout>
  }
/>
```

This ensures:

- Sidebar and Topbar persist across all admin routes.
- Only the **main content** (`children` of `AdminLayout`) changes per route.
- Each page can set its own title + subtitle while reusing the same chrome.

---

## Sidebar Active State

The left sidebar uses React Router’s `useLocation` + `NavLink` to highlight the active item based on the current URL.

- **Dashboard** item is active when the path is `/dashboard`.
- **Poll Category Master** item is active when the path starts with `/admin/categories`.
- Other items remain disabled placeholders (e.g., `Users`, `Settings`).

This provides a clear orientation for admins as they move between:

- High‑level dashboard
- Category master list
- Category create/edit flows

while keeping the visual style consistent with Steps 1–4.

---

## NotFound Page

- **File:** `frontend/src/pages/NotFound.tsx`
- Simple, centered 404 message with neutral styling.
- Used as the catch‑all route (`path="*"`) so invalid URLs do not render a broken layout.

This is intentionally minimal and non‑intrusive, aligning with the calm, enterprise Admin UI aesthetic.

---

## How to Access Pages via URL

With the dev server running (`npm run dev` in `frontend/`):

- **Dashboard**  
  `http://localhost:5173/dashboard`

- **Category Master (tree)**  
  `http://localhost:5173/admin/categories`

- **Create Category**  
  `http://localhost:5173/admin/categories/new`

- **Edit Category (mock)**  
  `http://localhost:5173/admin/categories/123/edit`  
  (the `:id` is currently ignored by the mock implementation but reserved for future backend integration).

Unknown URLs (e.g., `/admin/unknown`) will render the `NotFound` page instead of a blank screen.
