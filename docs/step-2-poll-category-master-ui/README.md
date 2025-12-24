# Step 2 – Poll Category Master UI

This step introduces the **Poll Category Master** page: a tree-structured, read-only view of poll categories designed to feel like a modern enterprise SaaS admin (Stripe/Vercel/Linear style) while still being **UI-only**.

There is **no backend, no forms, and no persistence** yet. All data is mock data rendered inside the existing `AdminLayout` shell from Step 1.

---

## Page Purpose

The Poll Category Master page is the **source of truth for how polls are grouped and discovered** across the product.

Typical use cases once wired to a backend:

- Define parent categories (e.g., Engagement, Product Feedback, Compliance).
- Attach child categories under each parent for more granular targeting.
- Enable or disable categories without deleting history.
- Give admins and CS teams a clear, audit-friendly view of the taxonomy.

In this step, we focus on **visualizing** that hierarchy in a premium table‑like layout.

---

## Layout & Header

The page lives inside the shared `AdminLayout`, which provides:

- Fixed left sidebar with **Poll Category Master** shown as the active item.
- Sticky top bar with the page title and subtitle.
- Centered content card with neutral background, border, and subtle shadow.

Inside that content card, the page adds its own **local header row**:

- **Left**: page title + one-line description.
- **Right**: `+ Add Category` button (non-functional in this step).

This mirrors common SaaS patterns where the chrome holds the global context and the page header focuses on the primary entity and its actions.

---

## Tree/Table Structure

The main body of the page is a **category tree rendered in a table layout**.

### Columns

- **Category Name**  
  The display name of the category. Parent categories are rendered in **bold**; child categories use regular weight.

- **Category Type**  
  Text label indicating whether this row represents a **Parent** or **Child** category.

- **Status**  
  A compact badge that surfaces whether the category is `Active` or `Disabled`.

- **Actions**  
  A three-dots (kebab) icon button for row-level actions. In this step it is non-functional, but visually aligned with enterprise admin patterns.

### Hierarchy & Indentation

The hierarchy is modeled as a **tree of category nodes**.

- Parent rows are rendered with no indentation.
- Child rows are rendered immediately after their parent with left indentation (`pl-*` classes) to make the tree depth legible at a glance.
- Parent categories use a slightly stronger typographic treatment to anchor each group.

Implementation details:

- `CategoryTable` (in `src/components/poll-category/CategoryTable.tsx`) receives a list of root nodes.
- It renders a semantic `<table>` with a styled header and body.
- `CategoryRow` (in `src/components/poll-category/CategoryRow.tsx`) renders one row for the given node and **recursively** renders any children below it, increasing the indentation per depth level.

---

## Mock Data Format

Mock data is stored in:

```text
frontend/src/mocks/categories.mock.ts
```

Types are defined in:

```text
frontend/src/types/category.ts
```

### Types

```ts
export type CategoryStatus = "active" | "disabled";

export type CategoryType = "parent" | "child";

export interface CategoryNode {
  id: string;
  name: string;
  type: CategoryType;
  status: CategoryStatus;
  children?: CategoryNode[];
}
```

### Example Mock Tree

```ts
export const categoryTreeMock: CategoryNode[] = [
  {
    id: "engagement",
    name: "Engagement",
    type: "parent",
    status: "active",
    children: [
      {
        id: "nps",
        name: "Net Promoter Score",
        type: "child",
        status: "active",
      },
      // ...more child nodes
    ],
  },
  // ...more parent nodes
];
```

The data intentionally mixes:

- Active and disabled parents.
- Active and disabled children.

This ensures the UI visually expresses all important states (indentation, type labels, and status badges) without needing a backend.

---

## Visual Design & Components

The Poll Category Master page adheres to the **same visual system** as Step 1:

- **Neutral surfaces**: `bg-background`, `bg-card`, `bg-muted` and default text tokens.
- **Subtle shadows**: `shadow-sm` on primary containers only.
- **Calm typography hierarchy**: titles, section headings, and helper text use consistent sizes and weights.
- **shadcn-style primitives only** for interactive pieces:
  - `Button` for the `+ Add Category` CTAs and the row action trigger.
  - `Badge` for status chips.
  - Layout and structure use semantic HTML with Tailwind utility classes.

Status colors use Tailwind’s token palette (e.g., `emerald` for Active, `slate` for Disabled) with soft backgrounds and legible foregrounds, aligned with enterprise admin dashboards.

---

## How the Backend Will Connect Later

When it is time to connect real data, the integration points are clear and isolated.

1. **Replace mock data source**  
   - Today, `PollCategoryMasterPage` imports `categoryTreeMock` from `src/mocks/categories.mock.ts`.
   - In a real app, this import can be replaced with a hook or data loader that retrieves categories from an API:
     - e.g., `useQuery("categories", fetchCategories)`.

2. **Map backend response to `CategoryNode`**  
   - Ensure the backend returns either the same shape or a shape that can be **mapped** into `CategoryNode[]`.
   - If the backend returns a flat list with `parentId` references, build the tree client-side before passing it to `CategoryTable`.

3. **Wire up actions**  
   - The three-dots action button is the natural anchor for row menus:
     - Edit category.
     - Disable / enable.
     - Move to a different parent.
   - The `+ Add Category` button can open a modal or side sheet using shadcn/ui patterns once create/edit forms are designed.

4. **Loading and empty states**  
   - The table component can easily be extended with conditional rendering for:
     - Loading skeletons.
     - Empty-state messaging when no categories exist.

Because the **UI contract is already established** (props and types), backend work can focus on data correctness and permissions, not layout or pixel-level decisions.

---

## Where Everything Lives

- **Page**  
  `frontend/src/pages/PollCategoryMasterPage.tsx`

- **Table & Row Components**  
  `frontend/src/components/poll-category/CategoryTable.tsx`  
  `frontend/src/components/poll-category/CategoryRow.tsx`

- **Types**  
  `frontend/src/types/category.ts`

- **Mock Data**  
  `frontend/src/mocks/categories.mock.ts`

This keeps responsibilities clean and ready for future iterations (filters, search, role-based access, etc.) without compromising the current enterprise-grade visual baseline.
