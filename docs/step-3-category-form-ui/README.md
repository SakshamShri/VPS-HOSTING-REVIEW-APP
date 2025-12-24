# Step 3 – Create / Edit Category Form UI

This step adds the **Create / Edit Category page** to the admin shell. It provides a card‑based form that clearly distinguishes **Parent vs Child category logic** and implements an **inheritance/override UX** for child categories.

The page is **UI‑only**—no backend, no validation, and no save logic. All data is mocked and the form is purely for demonstrating the enterprise‑grade interaction model.

---

## Page Purpose

The Create / Edit Category page is the **authoring surface for the taxonomy**. Admins use it to:

- Define new parent categories (top‑level groups).
- Define child categories that inherit defaults from a parent.
- Override specific inherited settings on a child (explicit, not silent).

This is the first place where **inheritance** becomes visible to the admin, so the UX must make inheritance obvious and overrides intentional.

---

## Policy Controls (Claimable, RequestAllowed, AdminCurated)

In addition to `Allow Poll Creation` and `Status`, the form now surfaces three **policy controls** that will later map directly to backend fields:

- **Claimable** – whether entities under this category can be claimed.
- **RequestAllowed** – whether requests can be made under this category.
- **AdminCurated** – whether the category is curated by admins (`YES`, `NO`, or `PARTIAL`).

### Parent Defaults

On parent categories, these appear in the **Parent Defaults (Applied to children unless overridden)** card as segmented controls:

- `Claimable default` → `YES` / `NO`.
- `Request allowed default` → `YES` / `NO`.
- `Admin curated default` → `YES` / `NO` / `PARTIAL`.

These defaults define how child categories behave **when they do not override** the policy.

### Child Overrides

On child categories, the same three fields live in the **Child Overrides** card:

- Each field starts in an **inherited** state:
  - Grey, read‑only surface.
  - Clear label (e.g. `Claimable`, `Request allowed`, `Admin curated`).
  - `InheritedField` component shows the parent’s effective value or `From parent` when unknown.
- Each field has an **explicit override toggle** via `OverrideToggle`:
  - When OFF → inherited view only, no edits.
  - When ON → a compact card with segmented controls becomes editable:
    - Claimable: `YES` / `NO`.
    - RequestAllowed: `YES` / `NO`.
    - AdminCurated: `YES` / `NO` / `PARTIAL`.

This keeps policy behavior **transparent**:

- Admins can see exactly which policy values are coming from the parent.
- Overrides are never implicit; they always require a deliberate toggle.
- The visual treatment (muted inherited fields vs. active override cards) aligns with the rest of the enterprise UI.

These fields are UI‑only for now, but their shape and behavior match the backend model introduced in Step 5, so wiring them later will be straightforward.

---

## Layout & Header

The page lives inside the shared `AdminLayout`, which provides:

- Fixed left sidebar (Poll Category Master remains active).
- Sticky top bar with page title and subtitle.
- Centered content card with neutral background, border, and subtle shadow.

Inside that card, the page adds a **local page title and description**:

- **Create Category** – “Define a new category in the taxonomy hierarchy.”
- **Edit Category** – “Modify the category configuration and inheritance behavior.”

No primary CTA is added yet; save logic is out of scope for this step.

---

## Form Structure (Card‑Based)

The form is split into **semantic cards** to keep the interface scannable and to allow future expansion without clutter.

### 1) Basic Information Card

- **Category Name (EN)** – text input.
- **Description** – optional textarea.

Both fields are simple text inputs using the shadcn‑style `Input` and `Textarea` components.

### 2) Category Type Card

- **Radio buttons**:
  - ( ) Parent Category
  - ( ) Child Category

- **If Child**:
  - **Parent Category dropdown** populated with mock parent categories.

The dropdown is built with the shadcn‑style `Select` component and only appears when “Child Category” is selected.

### 3) Parent Defaults Card (Only for Parent)

- **Allow Poll Creation** – toggle (`Switch`).
- **Status** – two‑button toggle (Active / Disabled).

These are the defaults that child categories can inherit.

### 4) Child Overrides Card (Only for Child)

This card surfaces **inheritance vs override** behavior:

- **Allow Poll Creation**:
  - Inherited by default; shows “(inherited)” label and a tooltip.
  - An **Override toggle** enables a custom value.
  - When override is on, the actual switch becomes editable.

- **Status**:
  - Inherited by default; shows “(inherited)” label and a tooltip.
  - An **Override toggle** enables a custom status.
  - When override is on, the Active/Disabled buttons become editable.

The pattern is:
- **Read‑only inherited value** → muted text, tooltip, “(inherited)” indicator.
- **Explicit override toggle** → `Switch` component that, when enabled, reveals the editable control.

This ensures no silent overrides and makes the inheritance model transparent.

---

## Inheritance & Override UX Rules

The implementation follows strict UX rules to keep the admin experience clear:

1. **Inherited fields must be visually distinct**
   - Muted text color.
   - “(inherited)” suffix.
   - Tooltip: “Inherited from parent category”.

2. **Override must be explicit**
   - A toggle per field that starts **off**.
   - Only when the toggle is ON does the field become editable.

3. **No silent overrides**
   - The UI never changes inherited values unless the admin explicitly enables the override toggle.

4. **Clear helper text everywhere**
   - Cards have short descriptions.
   - Tooltips explain inheritance.
   - Labels are concise and consistent.

---

## Mock Data & Modes

### Mock Data

- **Parent categories list**: derived from the same mock tree used in Step 2 (`categoryTreeMock` filtered to `type: "parent"`).
- **Edit mode mock values**:
  - Parent edit: pre‑filled name, description, defaults.
  - Child edit: pre‑filled name, description, parent, inherited defaults, and overrides disabled.

Mock data lives in:

```text
frontend/src/mocks/category-form.mock.ts
```

### Create vs Edit Mode

- **Create mode**:
  - All fields start empty or with sensible defaults.
  - Parent defaults are editable.
  - Child overrides start disabled.

- **Edit mode**:
  - Fields are pre‑filled with mock values.
  - Parent defaults reflect the current entity.
  - Child overrides start disabled, showing inherited values.

The page component (`CategoryFormPage`) accepts a `mode` prop (`"create"` | `"edit"`) and optional `initialValues` for edit scenarios.

---

## UI Components Used (shadcn‑style)

All form controls are shadcn‑style primitives:

- `Input`, `Textarea` – basic text fields.
- `Label` – field labels.
- `RadioGroup`, `RadioGroupItem` – Parent/Child selection.
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` – parent dropdown.
- `Switch` – toggles for boolean fields and override flags.
- `Tooltip`, `TooltipContent`, `TooltipTrigger` – inheritance hints.

No inline styles or custom CSS; only Tailwind utilities and token‑based colors.

---

## How the Backend Will Connect Later

When it’s time to wire real persistence, the integration points are clean and isolated:

1. **Replace mock data**
   - `CategoryFormPage` can accept a `data` prop or use a data‑fetching hook (`useQuery`).
   - The same `CategoryFormState` shape can be populated from the API response.

2. **Map API response to form state**
   - Ensure the backend returns the fields needed for both parent and child cases.
   - For children, include the inherited defaults so the UI can display them correctly.

3. **Submit payload**
   - The form currently holds its state in local component state.
   - A future “Save” button will serialize:
     - Base fields (`name`, `description`, `type`, `parentCategoryId`).
     - For parents: `allowPollCreation`, `status`.
     - For children: `overrides` object indicating which fields are overridden and their custom values.

4. **Validation & error handling**
   - This step intentionally omits validation.
   - When adding validation, use the same shadcn‑style patterns (e.g., inline error messages below fields).

5. **Loading / error states**
   - The card layout makes it easy to add skeleton loaders or error banners without disrupting the visual hierarchy.

Because the UI contract is explicit (props, state shape, and component boundaries), backend work can focus on data consistency and permissions, not layout decisions.

---

## Where Everything Lives

- **Page**
  - `frontend/src/pages/CategoryFormPage.tsx`

- **Form Section Components**
  - `frontend/src/components/category-form/BasicInfoCard.tsx`
  - `frontend/src/components/category-form/CategoryTypeCard.tsx`
  - `frontend/src/components/category-form/ParentDefaultsCard.tsx`
  - `frontend/src/components/category-form/ChildOverridesCard.tsx`

- **Form Types**
  - `frontend/src/types/category-form.ts`

- **Mock Data**
  - `frontend/src/mocks/category-form.mock.ts`

- **Routing**
  - `frontend/src/App.tsx`
    - `/create` → Create mode
    - `/edit/:id` → Edit mode
    - `/dashboard` → List view (from Step 2)

---

## How to View It

If your Vite dev server is still running:

- **Create mode**: `http://localhost:5173/create`
- **Edit mode (mock)**: `http://localhost:5173/edit/engagement` (or any ID; the mock ignores the param for now)
- **List view**: `http://localhost:5173/dashboard`

You should see:

- Same admin chrome as Steps 1 and 2.
- Card‑based form with:
  - Basic fields.
  - Parent/Child selection.
  - Conditional Parent Defaults or Child Overrides.
  - Inheritance indicators and override toggles for children.

If the inheritance/override UX feels unclear or the spacing doesn’t match the enterprise baseline, tell me what to adjust (e.g., tooltip wording, toggle placement, card padding).
