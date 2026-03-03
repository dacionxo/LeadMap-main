# Property Skip Trace Table

## What it does

- **Table `property_skip_trace`** holds one row per property from:
  - `fsbo_leads`
  - `frbo_leads`
  - `foreclosure_listings`
- **Columns copied in real time** from those tables: `property_url`, `listing_id`, `street`.
- **New columns** (for Grok skip-trace data): `resident_type`, `resident_name`, `resident_age`, `resident_phone_numbers`, `resident_previous_address`.

Triggers keep the table in sync: every INSERT/UPDATE/DELETE on the three source tables is reflected in `property_skip_trace`. The resident columns stay `NULL` until you populate them (e.g. from the Grok Cyberbackgroundchecks workflow).

## How to run the migration

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Open `supabase/migrations/20260226000000_create_property_skip_trace.sql` in this repo.
3. Copy the full contents and run it in the SQL Editor.

Or, if you use Supabase CLI:

```bash
supabase db push
```

(Ensure your project is linked and the migration file is in `supabase/migrations/`.)

## Table schema (reference)

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (auto) |
| source_table | text | `fsbo_leads` \| `frbo_leads` \| `foreclosure_listings` |
| listing_id | text | From source table |
| property_url | text | From source |
| street | text | Street name from source |
| resident_type | text | e.g. Current \| Previous (from skip-trace) |
| resident_name | text | Resident name (from skip-trace) |
| resident_age | text | Age (from skip-trace) |
| resident_phone_numbers | text | Semicolon-separated (from skip-trace) |
| resident_previous_address | text | Prior address (from skip-trace) |
| created_at | timestamptz | Set on insert |
| updated_at | timestamptz | Updated on row change |

Unique constraint: `(source_table, listing_id)`.

## Matching Grok skip-trace results to rows

After you run the Grok Cyberbackgroundchecks workflow for an address:

1. **Normalize the address** (e.g. with `address_reformatter.reformat()`) so it matches how you store `street` (or a full address you derive).
2. **Find the row(s)** in `property_skip_trace` where the normalized address matches `street` (or a concatenation of street/city/state/zip if you add those columns later).
3. **Update the row** with the resident data:

```python
from supabase_client import get_supabase

supabase = get_supabase()
supabase.table("property_skip_trace").update({
    "resident_type": "Current",
    "resident_name": "Jane Doe",
    "resident_age": "45",
    "resident_phone_numbers": "(555) 123-4567",
    "resident_previous_address": "123 Old St, City, ST 12345",
}).eq("source_table", "fsbo_leads").eq("listing_id", "the-listing-id").execute()
```

For multiple residents per property you can either: store one row per resident (add more rows with the same `source_table`/`listing_id` and different resident data—you’d need to relax or change the unique constraint), or store JSON in the resident columns. The current schema supports one resident set per property; extend as needed.

## Backfill

The migration script includes a one-time backfill that inserts all existing rows from `fsbo_leads`, `frbo_leads`, and `foreclosure_listings` into `property_skip_trace`. After that, triggers keep the table in sync.

---

## Skip-trace-missing workflow (bulk from Supabase)

**Goal:** Run Grok only for properties that don’t have resident data yet, then write results back to Supabase.

1. **Query Supabase** for `property_skip_trace` rows where all five resident columns are null/empty (`resident_type`, `resident_name`, `resident_age`, `resident_phone_numbers`, `resident_previous_address`).
2. **Build an address list** from those rows (using `street`; deduplicated by normalized street).
3. **Run the Grok Cyberbackgroundchecks batch** for that list (same concurrency, proxy, model fallback as normal batch).
4. **Push results to Supabase** (each response is matched by normalized street and the corresponding row(s) are updated).

### CLI

From the `Grok-Api` folder:

```bash
# Process all properties missing resident data (default workers)
python ask_grok_cyberbackground.py --skip-trace-missing

# Cap how many to process this run (e.g. 500)
python ask_grok_cyberbackground.py --skip-trace-missing --limit 500

# Use more workers
python ask_grok_cyberbackground.py --skip-trace-missing --workers 200 --limit 1000
```

- **`--skip-trace-missing`** — Enables this workflow; no batch file or single address is used.
- **`--limit N`** — Only consider the first N rows missing resident data (optional).
- **`--workers N`** — Same as for batch mode (default 500).

Results are written to `property_skip_trace` (resident columns updated) and a combined CSV is still written under `HarvestedOutput/` for the run.

### Flow summary

| Step | What happens |
|------|-------------------------------|
| 1 | Fetch rows from `property_skip_trace` where `resident_name` IS NULL (and all five resident fields empty). |
| 2 | Build unique addresses from `street` (dedupe by normalized street). |
| 3 | `run_batch(addresses)` with proxies and model fallback. |
| 4 | Each address’s Grok result is pushed via `update_property_skip_trace_from_grok_rows` (match by street, update resident columns). |

