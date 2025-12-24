# Step 4 – Impact Preview Modal

This step introduces an **Impact Preview** modal that appears when an admin is editing a **parent category** and wants to see how a change will affect its **child categories**.

The focus is **UI + UX only**:

- No backend.
- No real persistence.
- All impact data is mocked.

---

## When the Modal is Triggered

The modal is triggered from the **Edit Category** page when the admin is editing a **parent** category.

- On the edit form, a small secondary button labeled:
  - `Preview impact of parent changes`
- Clicking this button opens the **Impact Preview** dialog with mock impact data.

This makes the confirmation step **explicit** and avoids accidental changes to a large number of child categories.

---

## Modal Purpose & Content

The modal exists to make potential downstream impact **unmissable** before a parent category change is applied.

### Title

- `Confirm Category Change`

### Body Text

- A clear sentence describing the blast radius:

  > Changing this parent category will affect **X** child categories.

### Optional List

- Up to **3 child category names** are shown explicitly.
- If more children exist, a subtle line appears:

  - `+ N more categories`

This gives admins quick visibility into **what** will be impacted without overwhelming them with a full table.

### Footer Actions

- **Cancel** – secondary button, closes the modal.
- **Confirm Change** – primary, destructive-styled button which:
  - Logs a message to `console.log` (mock action only).
  - Closes the modal.

There is **no save logic** and no backend call in this step.

---

## Parent vs Child Logic

The Impact Preview modal is only relevant when **parent categories** are being changed:

- Parent changes may cascade down to all of their children (status, defaults, etc.).
- Child edits already have granular override controls (from Step 3) and therefore do not use this modal.

In the current UI-only implementation, the trigger button is shown when:

- The Create/Edit page is in **edit** mode, and
- The category kind is **parent**.

The modal **does not** attempt to introspect real changes; it simply illustrates the UX pattern for impact preview.

---

## Inheritance & Override UX Relationship

From Step 3, child categories can **inherit** settings from their parent or explicitly **override** them.

The Impact Preview modal complements that design by:

- Making the **scope of a parent change** clear before it is applied.
- Listing the children that may inherit the new value by default.
- Reinforcing that parent-level changes are not isolated; they may affect many child categories at once.

In a real system, the modal would highlight:

- Children that currently **inherit** a setting (and will be updated).
- Children that have **overrides** (and will *not* be changed).

---

## Mock Data & Types

### Types

- `frontend/src/types/impactPreview.types.ts`

  ```ts
  export interface ImpactPreviewData {
    parentName: string;
    impactedChildNames: string[];
  }
  ```

### Mock Data

- `frontend/src/mocks/impactPreview.mock.ts`

  ```ts
  export const impactPreviewMock: ImpactPreviewData = {
    parentName: "Engagement",
    impactedChildNames: [
      "Net Promoter Score",
      "Customer Satisfaction",
      "Churn Risk",
      "Feature Adoption",
      "UX Issues",
    ],
  };
  ```

The modal consumes this mock object to:

- Compute the total number of impacted children.
- Show up to **3** names.
- Derive the `+ N more categories` line when appropriate.

---

## UI Implementation Details

- **Component**: `frontend/src/components/ImpactPreviewModal.tsx`
- **Dialog Primitive**: `frontend/src/components/ui/dialog.tsx` (shadcn-style wrapper around `@radix-ui/react-dialog`).
- **Styling**:
  - Neutral surfaces and text colors.
  - A soft, amber-toned icon badge to signal caution without being alarming.
  - Card-like impact list.
  - Strong primary destructive button (`bg-destructive text-destructive-foreground`).

The overall tone is **serious and deliberate**, not scary.

---

## How Backend Will Connect Later

In a real implementation, the backend would:

1. **Calculate Impact**
   - Given a parent category ID and a proposed change, determine:
     - Which child categories inherit the relevant settings.
     - Which children have overrides and will not be affected.

2. **Provide Impact Data to the UI**
   - Expose an endpoint such as:

     ```http
     GET /categories/:parentId/impact-preview
     ```

   - Response shape could match or extend `ImpactPreviewData`:

     ```json
     {
       "parentName": "Engagement",
       "impactedChildNames": ["NPS", "CSAT", "Churn Risk"],
       "totalImpacted": 14
     }
     ```

   - The UI would map this into the modal props.

3. **Confirmation Flow**
   - When the admin confirms, the client would:
     - Send the actual **update** payload for the parent category.
     - Optionally include an impact token or hash to ensure that the preview is still valid.

Because this step already defines the **visual contract** (`ImpactPreviewData`), backend and product work can focus on the impact logic while reusing the existing modal as-is.
