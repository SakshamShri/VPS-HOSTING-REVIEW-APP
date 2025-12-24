# Step 8 3 Poll Config Master Backend

This document describes the backend implementation for **Poll Config Master** ("Poll DNA").
This step is **backend-only**: no voting, poll instances, or UI integration are
implemented here.

## Poll Config vs. Poll Instance

- **Poll Config (Poll DNA)**
  - A reusable blueprint describing how a poll should behave and look.
  - Contains UI template, theme, rules, and permissions.
  - Versioned and publishable (DRAFT 3 ACTIVE lifecycle).

- **Poll Instance** (not implemented in this step)
  - A concrete poll scheduled and shown to end users.
  - References a Poll Config to know how to render and behave.
  - Owns runtime state such as schedule, targeting, and responses.

In other words, **Poll Config** is design-time configuration; **Poll Instance** is
runtime execution that will be built later.

## Schema design (Prisma)

The Prisma schema adds enums and a `PollConfig` model alongside the existing
`Category` model.

```prisma
enum PollConfigStatus {
  DRAFT
  ACTIVE
  DISABLED
}

enum PollUiTemplate {
  STANDARD_LIST
  YES_NO
  RATING
  SWIPE
  POINT_ALLOC
  MEDIA_COMPARE
}

model Category {
  id          BigInt      @id @default(autoincrement())
  name_en     String      @unique
  // ...existing fields...

  pollConfigs PollConfig[]
}

model PollConfig {
  id          BigInt           @id @default(autoincrement())
  name        String
  slug        String           @unique
  status      PollConfigStatus @default(DRAFT)

  category_id BigInt
  category    Category         @relation(fields: [category_id], references: [id])

  ui_template PollUiTemplate

  theme       Json
  rules       Json
  permissions Json

  version     Int              @default(1)
  created_at  DateTime         @default(now())
  updated_at  DateTime         @updatedAt
}
```

Key decisions:

- **`slug`** is a unique, URL-safe identifier derived from `name`, generated in the
  service layer. Collisions are resolved by appending numeric suffixes
  (`poll-config`, `poll-config-1`, ...).
- **`category_id`** references `Category.id` and is required.
  - A validation rule in the service ensures the category is a **child** category
    (not a parent) by checking `Category.is_parent === false`.
- **`ui_template`** is an enum capturing the supported UI templates. This is the core
  of the Poll DNA.
- **`theme`, `rules`, and `permissions`** are stored as JSON blobs to allow flexible
  evolution over time without schema churn.
- **`version`** increments with every update/publish to provide a lightweight
  configuration history.

## Types and validation

### Types

File: `src/types/pollConfig.types.ts`

Defines TypeScript types used by the service and repository layers:

- `PollConfigId` 3 bigint alias.
- `PollTheme` 3 `{ primaryColor, accentColor }`.
- Rule types:
  - `PollContentRules` (min/max options).
  - `PollVotingBehaviorRules` (flags).
  - `PollResultsRules` (visibility of results).
- `PollPermissions` 3 visibility, invite-only, admin-curated.
- `PollConfigCreateDTO` / `PollConfigUpdateDTO` 3 shapes used by the repository.

### Validators

File: `src/validators/pollConfig.validator.ts`

Uses **Zod** to validate incoming request payloads:

- `pollConfigCreateSchema` and `pollConfigUpdateSchema` validate:
  - `name`, optional `status` (defaulted to DRAFT in the controller).
  - `categoryId` as a string (converted to `bigint` later).
  - `uiTemplate` as one of the `PollUiTemplate` enum values.
  - `theme` object with `primaryColor` and `accentColor`.
  - `rules` and `permissions` JSON structure.
- `validateTemplateRules(template, rules)` performs template-specific checks, e.g.:
  - `YES_NO` templates must have exactly 2 options.
  - `STANDARD_LIST` and `RATING` templates require at least 2 options when
    `minOptions` is provided.

These validators ensure the service receives well-formed data and can focus on
business rules.

## Repository and service

### Repository

File: `src/repositories/pollConfig.repository.ts`

Thin wrapper around Prisma:

- `create(data)`
- `update(id, data)`
- `findById(id)`
- `findBySlug(slug)`
- `list()` (ordered by `created_at desc`)

### Service

File: `src/services/pollConfig.service.ts`

Implements the core business logic and validation:

- **Slug generation**
  - `toSlug(name)` lowercases and normalizes the name.
  - `generateUniqueSlug(baseName)` checks for collisions via `findBySlug`.
- **Category validation**
  - `ensureChildCategory(categoryId)` uses `categoryRepository.findById` and ensures
    `is_parent === false`.
- **Create**
  - Validates template-specific rules with `validateTemplateRules`.
  - Ensures the referenced category is a child.
  - Generates a unique slug.
  - Sets `version = 1` and `status` default DRAFT if not provided.
- **Update**
  - Loads existing config; throws `NOT_FOUND` if missing.
  - Merges existing and new template/rules for validation.
  - Validates `category_id` if changed.
  - Increments `version` on every successful update.
- **List / GetById**
  - Simple passthrough to the repository.
- **Clone**
  - Loads an existing config; throws `NOT_FOUND` if missing.
  - Generates a new slug `<name>-copy` with uniqueness.
  - Creates a new config with:
    - `name: "<original> (Copy)"`
    - `status: DRAFT`
    - `version: 1`
    - same category, template, theme, rules, and permissions.
- **Publish**
  - Marks a config as `ACTIVE` and increments `version`.

All higher-level rules (child category, template-specific options, version
increments, slug generation) live in the service layer as requested.

## Controllers and routes

### Controller

File: `src/controllers/pollConfig.controller.ts`

Controllers stay thin and delegate to the service:

- Parse `id` params into `bigint`.
- Validate request bodies via Zod schemas.
- Map service errors to HTTP responses:
  - `CATEGORY_NOT_CHILD` 3 400 with a clear message.
  - `CATEGORY_NOT_FOUND` 3 400.
  - `NOT_FOUND` 3 404.
  - Template rule violations ("options" errors) 3 400.

Endpoints:

- `POST /poll-configs` 3 create.
- `PUT /poll-configs/:id` 3 update.
- `GET /poll-configs` 3 list.
- `GET /poll-configs/:id` 3 get single.
- `POST /poll-configs/:id/clone` 3 clone as new DRAFT.
- `POST /poll-configs/:id/publish` 3 mark ACTIVE and bump version.

### Routes

File: `src/routes/pollConfig.routes.ts`

Registers the controller methods on an Express router and is mounted in `app.ts`:

```ts
pollConfigRouter.post("/poll-configs", (req, res) => pollConfigController.create(req, res));
pollConfigRouter.put("/poll-configs/:id", (req, res) => pollConfigController.update(req, res));
pollConfigRouter.get("/poll-configs", (req, res) => pollConfigController.list(req, res));
pollConfigRouter.get("/poll-configs/:id", (req, res) => pollConfigController.getById(req, res));
pollConfigRouter.post("/poll-configs/:id/clone", (req, res) => pollConfigController.clone(req, res));
pollConfigRouter.post("/poll-configs/:id/publish", (req, res) => pollConfigController.publish(req, res));
```

`src/app.ts` wires this router after the health and category routers.

## Health check extension

File: `src/controllers/health.controller.ts`

The `/health` endpoint now also probes the `poll_configs` table:

- Performs a lightweight `pollConfig.count()` call.
- Adds `pollConfigs: boolean` to the `checks` object in the JSON response.

This allows monitoring systems to detect schema or connectivity issues affecting
Poll Config Master specifically.

## API contracts (summary)

All endpoints are JSON over HTTP.

### POST /poll-configs

Create a new poll config.

- **Body** (simplified):

```json
{
  "name": "Standard Opinion Poll",
  "status": "DRAFT",
  "categoryId": "123",        // must be a CHILD category id
  "uiTemplate": "STANDARD_LIST",
  "theme": { "primaryColor": "#059669", "accentColor": "#ECFDF5" },
  "rules": {
    "contentRules": { "minOptions": 2, "maxOptions": 5 },
    "votingBehavior": { "allowMultipleVotes": false },
    "resultsRules": { "showResults": true, "showWhileOpen": false }
  },
  "permissions": {
    "visibility": "INTERNAL",
    "inviteOnly": false,
    "adminCurated": true
  }
}
```

- **Responses**:
  - `201` with the created `PollConfig` record.
  - `400` if category is not a child, missing, or rules violate template constraints.

### PUT /poll-configs/:id

Update an existing config. All fields are optional.

- Bumps `version` on each successful update.
- Validates any changed category/template/rules.

### GET /poll-configs

Return the list of configs ordered by `created_at desc`.

### GET /poll-configs/:id

Return a single config or `404` if not found.

### POST /poll-configs/:id/clone

Clone an existing config into a new DRAFT with `version = 1` and a new slug.

### POST /poll-configs/:id/publish

Mark a config as `ACTIVE` and increment `version`.

## Future extensibility

This backend is designed to be extended without breaking schema often:

- **JSON columns** (`theme`, `rules`, `permissions`) can evolve to support new
  templates and behaviors without migrations.
- **Versioning** makes it easy to track and audit changes or add rollback
  functionality later.
- The separation into **validator → service → repository** keeps controllers thin
  and makes it straightforward to:
  - Add authorization logic.
  - Expose additional read APIs (e.g. by slug).
  - Attach Poll Configs to Poll Instances when that layer is implemented.

This completes Step 8: a backend-only Poll Config Master service with Prisma
schema, business logic, validation, and HTTP endpoints.
