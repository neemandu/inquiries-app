# Moving the Airtable data to PostgreSQL

Plan written 26 November 2026, from the Airtable schema (`docs/airtable-schema.md`) and the backup of
the same date (`scripts/airtable-backup.py`). Nothing here has been built yet.

## What has to move

- **Data:** 16 tables, 33,056 records. Two tables are very wide: דיווחים חודשיים (161 fields) and
  חוסרים (162 fields).
- **Fields:** 596 in all.
  - 146 are calculated: formulas, lookups, rollups, counts and auto-numbers.
  - 54 are link fields, forming 27 linked pairs.
- **How the pairs connect:** 9 are one-to-one and 13 are one-to-many. The other 5 look many-to-many, but
  probably aren't. For example, a few employees are linked to 2 employers, and a few report periods
  have 2 tasks. These look like data errors to fix, not a real need for many-to-many.
- **The two wide tables:** they are mostly pairs of fields per report item (about 55), "חובה" (required)
  plus a value. The עמודות and שמות עמודות tables already define each employer's report columns.
- **Files:** about 10,700 attached files, in 6,239 filled attachment cells.
- **Views:** about 260. בירורים הוצאות שוטפות alone has 83, which suggests the office staff work in
  Airtable every day.
- **Who reads and writes the data:**
  - the Next.js app, through 12 Lambdas;
  - Make scenarios (at least seven webhooks, plus whatever uses `getClientColumns` and `binaryToBase64`);
  - Airtable automations;
  - the staff, in the Airtable screens themselves.

## Approach: two layers, moved in phases

### Phase 1: Inventory and decisions (before writing any code)

- [ ] List every Make scenario, Airtable automation and Interface that reads or writes the base.
- [ ] Decide what the office staff will use instead of Airtable's screens. This is the biggest decision.
  If they keep working in Airtable, PostgreSQL can only be a copy for now, not the main store.
- [ ] Choose hosting. Amazon RDS for PostgreSQL in eu-west-2 is the simplest choice, since the Lambdas
  are already there.
- [ ] Decide where the files go. An S3 bucket in the same region is the obvious choice.
- [ ] Decide how to protect personal data. There are passwords stored as plain text, ID numbers and
  card details, and Israeli privacy law (Amendment 13) applies.
  - Passwords: don't migrate them as they are. Hash them, or drop them if Clerk handles sign-in.
  - ID numbers: encrypt the column, or restrict who can read it.

### Phase 2: Raw layer, a copy that loses nothing

- [ ] A new script, `scripts/airtable-to-pg.py`, reads the existing backup JSON. It loads each record into
  a `raw.records` table, with one row per record holding the table, the Airtable record ID, the
  creation time and all fields as `jsonb`.
- [ ] It can be re-run safely: it updates rows by Airtable record ID instead of adding duplicates.
- [ ] Files are downloaded to S3 during this step. That also fixes the backup gap where attachment
  links expire.

### Phase 3: Clean layer, a proper database schema built with SQL from the raw layer

- [ ] **One table per Airtable table,** with English names, a numeric ID and a unique `airtable_id`
  column. Clerk, Make and the app keep working with the old record IDs during the move.
- [ ] **Links:** a one-to-one or one-to-many pair becomes a foreign key. A real many-to-many pair becomes
  a junction table. Fix the 5 doubtful pairs at this point.
- [ ] **Calculated fields:** formulas, lookups, rollups and counts become SQL views or generated columns,
  not stored values.
- [ ] **Auto-numbers:** the old numbers are kept in a sequence, because people refer to records by them.
- [ ] **Select fields:** become text columns limited to the allowed values, or small lookup tables.
- [ ] **Files:** go into an `attachments` table holding the owning table, record, field, S3 key, file
  name, type and size.
- [ ] **The two wide tables:**
  - Recommended first step: port them one-to-one, field for field.
  - Later: normalise them into one row per report item, driven by עמודות and שמות עמודות. That change
    also affects the app's monthly report screens, so it's a separate project.
- [ ] **Checking the result:** the backup includes the values Airtable calculated for every formula,
  lookup and rollup. A check script compares each SQL view with those values, field by field. It also
  compares row counts, totals of number and currency fields, and link counts per table.

### Phase 4: PostgreSQL as a read-only copy (no risk)

- [ ] Refresh it on a schedule (backup, then load), for example every hour. A full refresh takes about
  350 API calls, around 2 minutes.
- [ ] Use it for reports and to test the clean schema against real use.

### Phase 5: Move reads to PostgreSQL

- [ ] Switch the Next.js server routes and the Lambdas to read from PostgreSQL, one screen at a time
  behind a switch.
- [ ] At this point the Next.js server could query PostgreSQL directly and retire some Lambdas.

### Phase 6: Switch writes over (the real cutover)

1. Set the Airtable base to read-only.
2. Run a final refresh.
3. Switch the app's writes to PostgreSQL.
4. Repoint the Make scenarios. Make has a PostgreSQL module.
5. Bring the replacement staff screens into use.

Writes can't be synced back to Airtable, so rolling back is only clean up to this phase. Keep Airtable
read-only for a few weeks as a reference, then archive it with a final backup.

## Open decisions

1. What will the office staff use instead of Airtable's views: keep Airtable for now, an off-the-shelf
   admin tool (for example NocoDB or Retool), or screens built into this app?
2. Where should PostgreSQL be hosted: RDS in eu-west-2, or a managed service such as Neon or Supabase?
3. For the wide report tables, a one-to-one port first, or normalise them as part of the move?
4. Should the לוגים table (6,662 records) be migrated, or only archived?

## First step

Phase 2: the raw-layer loader and the check script. They can run against a local PostgreSQL, from the
backup files, with no effect on Airtable.
