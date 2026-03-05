# Deals Pipeline System — Kanban Documentation

This document describes the pipeline system powering the Deals Kanban board in the CRM at `/dashboard/crm/deals`. It covers how deals move through stages, how the Kanban renders and sorts them, and how the system integrates with the backend.

---

## Overview

The Deals Pipeline is a **Kanban board** that visualizes sales deals across seven stages, from initial lead to closed won or closed lost. Deals are displayed as cards in columns, one per stage. Users can:

- View deals grouped by stage
- Drag deals between columns to change stage
- Sort deals within each column
- Add new deals via the Add New Deal button or the + button in each column header

---

## Pipeline Stages

The Kanban uses seven fixed stages, mapped to database values:

| Stage Key     | Display Label | Description                    |
|---------------|---------------|--------------------------------|
| `new`         | Lead          | Initial lead, not yet contacted |
| `contacted`   | Contacted     | Initial contact made           |
| `qualified`   | Qualified     | Lead qualified for sales       |
| `proposal`    | Proposal      | Proposal sent                  |
| `negotiation` | Negotiation   | In negotiation                 |
| `closed_won`  | Closed Won    | Deal won                       |
| `closed_lost` | Closed Lost   | Deal lost                      |

### Stage Normalization

Stage names from the database may use different formats (e.g. `"New Lead"`, `"Closed Won"`). The system normalizes them to the keys above:

- `"New Lead"`, `"Lead"`, `"new"` → `new`
- `"Closed Won"`, `"Won"`, `"closed-won"` → `closed_won`
- `"Closed Lost"`, `"Lost"` → `closed_lost`
- And similar mappings for the other stages

If a stage does not match any known value, it defaults to `new` and the deal appears in the Lead column.

---

## Kanban Layout

### Columns

- Each stage is a **column** with a header showing:
  - Stage label (e.g. Lead, Contacted)
  - Number of deals
  - Average property value for that column
- Empty columns show a drop zone: “Drop leads here”
- Each column has a **+** button to add a new deal in that stage

### Cards

Two card types are used:

1. **LeadCard** — For stages `new` through `negotiation`  
   - Photo carousel (or primary photo / placeholder)  
   - Probability label (Closing Soon, Strong Buyer, etc.)  
   - Property address (clickable)  
   - Est. Value and Property Class  
   - Owner initials, days since creation, Details link  

2. **ClosedWonCard** — For `closed_won`  
   - Business icon and Closed badge  
   - Property address  
   - Est. Value and Close Date  
   - Simplified layout without photo carousel  

3. **Closed Lost** — Uses the same LeadCard layout, with styling driven by the stage.

---

## Data Flow

### 1. Fetching Deals

- **API:** `GET /api/crm/deals?page=1&pageSize=50&sortBy=created_at&sortOrder=desc`
- Deals are always fetched with the same sort (`created_at` desc) so the set of deals does not change when the user changes the Sort dropdown.
- The API enriches deals with:
  - `property_address`, `property_value` from linked listings
  - `photos_json`, `primary_photo` for property images
  - `property_class` for property type
  - `owner` from users

### 2. Bucketing by Stage

The Kanban groups deals by stage:

1. Initialize seven buckets (one per stage).
2. For each deal, map `deal.stage` → stage key via `normalizeStage()`.
3. Map stage key → column index via `columnForStage()`.
4. Add the deal to the corresponding bucket.

### 3. Sorting Within Columns

Sorting is done **within each column only**. It does not move deals between columns.

- **Sort options (from the Sort dropdown):**
  - Close date (soonest first) — `expected_close_date` asc
  - Probability (highest first) — `probability` desc
  - Value (highest first) — `value` desc
  - Date created (newest first) — `created_at` desc (default)

- Each bucket is sorted with a comparator based on the selected `sortBy` and `sortOrder`.

---

## Drag and Drop

### Moving Deals Between Columns

1. User starts a drag on a deal card.
2. User drops on a different column.
3. Kanban calls `onDealUpdate(dealId, { stage: targetStage })`.
4. Page sends `PUT /api/crm/deals/:id` with the new `stage`.
5. Local state is updated optimistically; `refreshDeals()` refetches to stay in sync.

### Stage Mapping

- Drop target column index → `stageForColumn(col)` → stage key (e.g. `"qualified"`).
- This stage is sent to the API; the backend stores the canonical stage value.

---

## Pipelines vs Kanban Stages

The app has two related concepts:

1. **Pipelines** — Saved configurations from `deal_pipelines` (via `GET /api/crm/deals/pipelines`). Each pipeline has a name, optional stages array, and can be marked as default. Deals can be assigned to a pipeline via `pipeline_id`.

2. **Kanban stages** — The seven fixed stages above (`new`, `contacted`, …, `closed_won`, `closed_lost`). The Kanban always renders these seven columns regardless of pipeline configuration.

The Kanban currently uses the fixed stage set. Pipelines are used when creating or editing deals (e.g. in `EditDealModal`, `DealFormModal`).

---

## Deal Model (Relevant Fields)

| Field               | Type     | Description                           |
|---------------------|----------|---------------------------------------|
| `id`                | string   | Unique deal ID                        |
| `title`             | string   | Deal name                             |
| `stage`             | string   | Stage key (e.g. `qualified`)          |
| `value`             | number?  | Deal value                            |
| `forecast_value`    | number?  | Forecasted value                      |
| `property_value`    | number?  | Value from linked listing             |
| `property_address`  | string?  | Address from linked listing           |
| `property_class`    | string?  | Property type (e.g. Single Family)    |
| `probability`       | number?  | Win probability (0–100)               |
| `expected_close_date` | string? | Expected close date                  |
| `created_at`        | string?  | Creation timestamp                    |
| `owner`             | object?  | Owner (id, name, email)               |
| `listing_id`        | string?  | Linked listing ID                     |
| `photos_json`       | array?   | Property photo URLs                   |
| `primary_photo`     | string?  | Primary photo URL                     |

---

## Scrolling Behavior

- **Horizontal scroll** — When the cursor is over the main Kanban area (not over a column’s card list), the mouse wheel scrolls the board horizontally.
- **Vertical scroll** — When the cursor is over a column’s scroll area (class `custom-scrollbar`), the wheel scrolls that column vertically.

---

## UI Components

### Page (`/app/dashboard/crm/deals/page.tsx`)

- Loads deals and pipelines.
- Manages `sortBy` / `sortOrder` for the Sort dropdown.
- Passes `deals`, `sortBy`, `sortOrder`, and callbacks to `DealsKanban`.

### Kanban (`/app/dashboard/crm/deals/components/DealsKanban.tsx`)

- Renders the board.
- Buckets deals by stage.
- Sorts each bucket.
- Handles drag-and-drop and column interactions.

---

## API Endpoints

| Endpoint                          | Purpose                                |
|-----------------------------------|----------------------------------------|
| `GET /api/crm/deals`              | List deals (pagination, sort)          |
| `PUT /api/crm/deals/:id`          | Update deal (including `stage`)        |
| `DELETE /api/crm/deals/:id`       | Delete deal                            |
| `GET /api/crm/deals/pipelines`    | List pipelines                         |
| `GET /api/crm/deals/listing?listingId=...` | Fetch property details for a deal |

---

## File Reference

| File                                                       | Role                                               |
|------------------------------------------------------------|----------------------------------------------------|
| `app/dashboard/crm/deals/page.tsx`                         | Deals page, data loading, Sort dropdown            |
| `app/dashboard/crm/deals/components/DealsKanban.tsx`       | Kanban board, bucketing, sorting, drag-and-drop    |
| `app/api/crm/deals/route.ts`                               | Deals CRUD, stage normalization                    |
| `app/api/crm/deals/pipelines/route.ts`                     | Pipelines list and create                          |
