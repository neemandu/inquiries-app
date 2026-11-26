# API keys: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are read from lambda/.env (not committed), unless already set in the environment; AIRTABLE_RESTORE_API_KEY, if set, is used instead of AIRTABLE_API_KEY.
"""Rebuild the Airtable content from a backup made by scripts/airtable-backup.py.

It restores into a NEW, EMPTY base, never into the live one (AIRTABLE_BASE_ID is refused):
  python3 scripts/airtable-restore.py <backup-dir> --dry-run                    # plan only, no network calls
  python3 scripts/airtable-restore.py <backup-dir> --target-base appXXXXXXXXXXXXXX
  python3 scripts/airtable-restore.py <backup-dir> --workspace wspXXXXXXXXXXXXXX [--name "..."]

The token needs the scopes schema.bases:read, schema.bases:write, data.records:read and
data.records:write, with access to the target base (or to the workspace, to create one).

What it does:
  1. Creates the tables with every field the API can create (text, numbers, checkboxes, selects,
     dates, attachments, ...).
  2. Creates the link fields, once per linked pair, and renames the field Airtable adds on the
     other side to its name in the backup.
  3. Creates the records, then fills in the links using the new record IDs.
  4. Writes restore-report.md and record-id-map.json into the backup folder.

What it can't restore, because the Airtable API can't create it (listed in restore-report.md, to
re-create by hand): formula, lookup, rollup, count, auto-number, created/modified time, button and
AI fields, views, and automations. A primary field of one of those types is restored as a plain
field holding its old value (auto-numbers as a number, formulas as text). Records get new IDs and
new created times; record-id-map.json maps old IDs to new ones (Clerk user metadata, Make and the
Lambdas store record IDs).

Attachments are saved in the backup as Airtable links that expire after a few hours. They are
skipped unless --with-attachments is given, which only works with a fresh backup.

If it stops part-way, run the same command again: progress is kept in restore-state.json and
restore-records.jsonl in the backup folder, and finished steps are skipped.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

API = 'https://api.airtable.com/v0'
ROOT = Path(__file__).resolve().parent.parent

# Field types the API can't create
COMPUTED = {
    'formula', 'multipleLookupValues', 'lookup', 'rollup', 'count', 'autoNumber', 'createdTime',
    'lastModifiedTime', 'createdBy', 'lastModifiedBy', 'button', 'aiText', 'externalSyncSource',
}
# What a computed primary field becomes, so the table keeps its record names
PRIMARY_AS = {
    'autoNumber': 'number', 'count': 'number', 'formula': 'singleLineText', 'rollup': 'singleLineText',
    'multipleLookupValues': 'singleLineText', 'aiText': 'multilineText', 'button': 'singleLineText',
    'createdTime': 'dateTime', 'lastModifiedTime': 'dateTime',
    'createdBy': 'singleLineText', 'lastModifiedBy': 'singleLineText', 'externalSyncSource': 'singleLineText',
}
PIPE = '\\|'  # a | inside a Markdown table cell
TEXT_TYPES = {'singleLineText', 'multilineText', 'email', 'url', 'phoneNumber', 'richText', 'multipleAttachments'}


def load_env():
    env_file = ROOT / 'lambda' / '.env'
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            name, sep, value = line.strip().partition('=')
            if sep and not name.startswith('#'):
                os.environ.setdefault(name.strip(), value.strip())


class ApiError(Exception):
    pass


class Airtable:
    def __init__(self, key):
        self.key = key
        self.last = 0.0
        self.calls = 0

    def call(self, method, path, body=None):
        data = json.dumps(body).encode() if body is not None else None
        for _ in range(8):
            wait = 0.22 - (time.time() - self.last)  # under 5 requests per second per base
            if wait > 0:
                time.sleep(wait)
            self.last = time.time()
            self.calls += 1
            req = urllib.request.Request(
                API + path, data=data, method=method,
                headers={'Authorization': 'Bearer ' + self.key, 'Content-Type': 'application/json'},
            )
            try:
                with urllib.request.urlopen(req, timeout=120) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    time.sleep(30)
                    continue
                if e.code >= 500:
                    time.sleep(5)
                    continue
                raise ApiError(f'{method} {path}: {e.code} {e.read().decode(errors="replace")[:500]}') from None
            except urllib.error.URLError:
                time.sleep(5)
        raise ApiError(f'{method} {path}: gave up after retries')


# ---------- Field definitions ----------

def clean_options(ftype, o):
    o = o or {}
    if ftype in ('singleSelect', 'multipleSelects'):
        return {'choices': [{k: v for k, v in c.items() if k in ('name', 'color')} for c in o.get('choices', [])]}
    if ftype == 'date':
        return {'dateFormat': {'name': o.get('dateFormat', {}).get('name', 'iso')}}
    if ftype == 'dateTime':
        return {
            'dateFormat': {'name': o.get('dateFormat', {}).get('name', 'iso')},
            'timeFormat': {'name': o.get('timeFormat', {}).get('name', '24hour')},
            'timeZone': o.get('timeZone', 'client'),
        }
    if ftype in TEXT_TYPES:
        return None
    if ftype == 'number':
        return {'precision': o.get('precision', 0)}
    return o or None


def field_spec(f, primary=False):
    ftype = f['type']
    options = f.get('options')
    if primary and ftype in PRIMARY_AS:
        ftype = PRIMARY_AS[ftype]
        options = (options or {}).get('result', {}).get('options') if ftype == 'dateTime' else None
    spec = {'name': f['name'], 'type': ftype}
    if f.get('description'):
        spec['description'] = f['description']
    opts = clean_options(ftype, options)
    if opts is not None:
        spec['options'] = opts
    return spec


def creatable(f, primary_id):
    return f['id'] == primary_id or (f['type'] not in COMPUTED and f['type'] != 'multipleRecordLinks')


# ---------- Planning (offline) ----------

def load_backup(backup):
    schema = json.loads((backup / 'schema.json').read_text())
    tables = schema['tables']
    records = {}
    for t in tables:
        path = backup / f"{t['id']}.json"
        if not path.exists():
            sys.exit(f'Missing {path}: the backup is incomplete')
        records[t['id']] = json.loads(path.read_text())['records']
    return tables, records


def plan_links(tables, records):
    """One field of each linked pair is created and written; Airtable fills in the other side.
    The side with more filled cells (shorter lists per cell) is the one written."""
    filled = {}
    by_id = {}
    for t in tables:
        for f in t['fields']:
            if f['type'] == 'multipleRecordLinks':
                by_id[f['id']] = (t, f)
                filled[f['id']] = sum(1 for r in records[t['id']] if r['fields'].get(f['name']))
    owners, seen = [], set()
    for fid, (t, f) in by_id.items():
        if fid in seen:
            continue
        inv = f['options'].get('inverseLinkFieldId')
        seen.add(fid)
        if inv in by_id and inv not in seen:
            seen.add(inv)
            if filled[inv] > filled[fid]:
                owners.append((by_id[inv][0], by_id[inv][1], t, f))
                continue
            owners.append((t, f, by_id[inv][0], by_id[inv][1]))
        else:
            owners.append((t, f, None, None))
    return owners


def describe_skipped(f, names):
    o = f.get('options') or {}
    if f['type'] == 'formula':
        return 'formula: ' + re.sub(r'\{(fld[A-Za-z0-9]{14})\}', lambda m: '{' + names.get(m[1], m[1]) + '}', o.get('formula', ''))
    if f['type'] in ('multipleLookupValues', 'lookup', 'rollup'):
        text = f"{names.get(o.get('fieldIdInLinkedTable'), '?')} through {names.get(o.get('recordLinkFieldId'), '?')}"
        if f['type'] == 'rollup':
            text += f", formula {o.get('formula', '')}" if o.get('formula') else ''
        return text
    if f['type'] == 'count':
        return 'count of ' + names.get(o.get('recordLinkFieldId'), '?')
    if f['type'] == 'aiText':
        prompt = ''.join(p if isinstance(p, str) else '{' + names.get(p.get('field', {}).get('fieldId'), '?') + '}' for p in o.get('prompt', []))
        return 'AI prompt: ' + prompt.replace('\n', ' ')[:300]
    return ''


def write_report(backup, tables, records, owners, failures, link_misses, target, attachments):
    names = {f['id']: f['name'] for t in tables for f in t['fields']}
    lines = ['# Airtable restore report', '', f'Target base: `{target or "(dry run)"}`', '']
    lines += ['| Table | Records | Fields restored | Fields to re-create by hand | Views |', '|---|---|---|---|---|']
    for t in tables:
        skipped = [f for f in t['fields'] if not creatable(f, t['primaryFieldId']) and f['type'] != 'multipleRecordLinks']
        restored = len(t['fields']) - len(skipped)
        lines.append(f"| {t['name']} | {len(records[t['id']])} | {restored} | {len(skipped)} | {len(t.get('views', []))} |")
    lines += ['', 'Views and automations are not restored by the API and must be set up again by hand.']
    if not attachments:
        n = sum(1 for t in tables for f in t['fields'] if f['type'] == 'multipleAttachments' for r in records[t['id']] if r['fields'].get(f['name']))
        lines.append(f'Attachments were skipped ({n} filled attachment cells): the links in the backup expire.')
    for t in tables:
        prim = next(f for f in t['fields'] if f['id'] == t['primaryFieldId'])
        skipped = [f for f in t['fields'] if not creatable(f, t['primaryFieldId']) and f['type'] != 'multipleRecordLinks']
        lines += ['', f"## {t['name']}", '']
        if prim['type'] in PRIMARY_AS:
            lines.append(f"Primary field **{prim['name']}** was `{prim['type']}`; restored as `{PRIMARY_AS[prim['type']]}` holding the old values. {describe_skipped(prim, names)}".rstrip())
            lines.append('')
        if skipped:
            lines += ['| Field | Type | Definition |', '|---|---|---|']
            for f in skipped:
                definition = describe_skipped(f, names).replace('|', PIPE)
                lines.append(f"| {f['name']} | {f['type']} | {definition} |")
        else:
            lines.append('All fields restored.')
    lines += ['', '## Links', '', '| Written field | Other side (filled in by Airtable) |', '|---|---|']
    for t, f, it, inv in owners:
        other = f"{it['name']}.{inv['name']}" if inv else '(none)'
        lines.append(f"| {t['name']}.{f['name']} | {other} |")
    if failures:
        lines += ['', '## Records that failed', '', '| Table | Old record ID | Error |', '|---|---|---|']
        for tname, rid, err in failures:
            lines.append(f"| {tname} | {rid} | {err.replace('|', PIPE)[:300]} |")
    if link_misses:
        lines += ['', f'{link_misses} linked record IDs had no restored record and were left out.']
    (backup / 'restore-report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')


# ---------- Restore ----------

def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('backup', type=Path, help='backup folder from airtable-backup.py')
    parser.add_argument('--target-base', help='ID of an empty base to restore into')
    parser.add_argument('--workspace', help='create a new base in this workspace (wsp...) instead')
    parser.add_argument('--name', help='name of the new base (with --workspace)')
    parser.add_argument('--with-attachments', action='store_true', help='re-attach files from the backup links (fresh backups only)')
    parser.add_argument('--dry-run', action='store_true', help='show the plan and write the report; no network calls')
    args = parser.parse_args()

    backup = args.backup.expanduser().resolve()
    tables, records = load_backup(backup)
    owners = plan_links(tables, records)
    total = sum(len(r) for r in records.values())

    if args.dry_run:
        print(f'{len(tables)} tables, {total} records, {len(owners)} link fields to create and write')
        for t in tables:
            n_create = sum(1 for f in t['fields'] if creatable(f, t['primaryFieldId']))
            n_links = sum(1 for f in t['fields'] if f['type'] == 'multipleRecordLinks')
            print(f"  {t['name']}: {len(records[t['id']])} records, {n_create} fields + {n_links} links, "
                  f"{len(t['fields']) - n_create - n_links} to re-create by hand")
        est = len(tables) + 2 * len(owners) + sum(-(-len(r) // 10) for r in records.values()) * 2
        print(f'About {est} API calls, roughly {est * 0.25 / 60:.0f} minutes or more')
        write_report(backup, tables, records, owners, [], 0, None, args.with_attachments)
        print('Plan written to', backup / 'restore-report.md')
        return

    if bool(args.target_base) == bool(args.workspace):
        sys.exit('Give either --target-base or --workspace (or --dry-run)')
    load_env()
    key = os.environ.get('AIRTABLE_RESTORE_API_KEY') or os.environ.get('AIRTABLE_API_KEY')
    if not key:
        sys.exit('No Airtable token: set AIRTABLE_API_KEY in lambda/.env or AIRTABLE_RESTORE_API_KEY')
    live = os.environ.get('AIRTABLE_BASE_ID')
    if args.target_base and args.target_base == live:
        sys.exit(f'{live} is the live base (AIRTABLE_BASE_ID). Restore into a new, empty base.')

    state_path = backup / 'restore-state.json'
    rec_log = backup / 'restore-records.jsonl'
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    if state and args.target_base and state.get('base') != args.target_base:
        sys.exit(f"{state_path} belongs to a restore into {state.get('base')}; move it away to start a new restore")
    state.setdefault('tables', {})
    state.setdefault('fields', {})
    state.setdefault('linksWritten', [])

    def save():
        tmp = state_path.with_suffix('.tmp')
        tmp.write_text(json.dumps(state, ensure_ascii=False, indent=1))
        tmp.replace(state_path)

    rec_map = {}
    if rec_log.exists():
        for line in rec_log.read_text().splitlines():
            if line.strip():
                rec_map.update(json.loads(line))

    at = Airtable(key)
    old_tables = {t['id']: t for t in tables}

    # 1. The base
    if not state.get('base'):
        if args.workspace:
            first = tables[0]
            body = {
                'name': args.name or f'Restore of {backup.name}',
                'workspaceId': args.workspace,
                'tables': [{'name': first['name'], 'description': first.get('description') or None,
                            'fields': [field_spec(f, f['id'] == first['primaryFieldId'])
                                       for f in sorted(first['fields'], key=lambda f: f['id'] != first['primaryFieldId'])
                                       if creatable(f, first['primaryFieldId'])]}],
            }
            if not body['tables'][0]['description']:
                del body['tables'][0]['description']
            res = at.call('POST', '/meta/bases', body)
            state['base'] = res['id']
            new_t = res['tables'][0]
            state['tables'][first['id']] = new_t['id']
            by_name = {f['name']: f['id'] for f in new_t['fields']}
            for f in first['fields']:
                if f['name'] in by_name:
                    state['fields'][f['id']] = by_name[f['name']]
            print('Created base', res['id'], flush=True)
        else:
            existing = at.call('GET', f'/meta/bases/{args.target_base}/tables')['tables']
            clash = {t['name'] for t in existing} & {t['name'] for t in tables}
            if clash:
                sys.exit(f'The target base already has tables named {", ".join(sorted(clash))}: use an empty base')
            state['base'] = args.target_base
        save()
    base = state['base']
    if base == live:
        sys.exit('Refusing to write to the live base')

    # 2. Tables and their plain fields
    for t in tables:
        if t['id'] in state['tables']:
            continue
        fields = [field_spec(f, f['id'] == t['primaryFieldId'])
                  for f in sorted(t['fields'], key=lambda f: f['id'] != t['primaryFieldId'])  # primary first
                  if creatable(f, t['primaryFieldId'])]
        body = {'name': t['name'], 'fields': fields}
        if t.get('description'):
            body['description'] = t['description']
        res = at.call('POST', f'/meta/bases/{base}/tables', body)
        state['tables'][t['id']] = res['id']
        by_name = {f['name']: f['id'] for f in res['fields']}
        for f in t['fields']:
            if f['name'] in by_name:
                state['fields'][f['id']] = by_name[f['name']]
        save()
        print('Table', t['name'], flush=True)

    # 3. Link fields
    for t, f, it, inv in owners:
        if f['id'] in state['fields']:
            continue
        body = {'name': f['name'], 'type': 'multipleRecordLinks',
                'options': {'linkedTableId': state['tables'][f['options']['linkedTableId']]}}
        if f.get('description'):
            body['description'] = f['description']
        res = at.call('POST', f"/meta/bases/{base}/tables/{state['tables'][t['id']]}/fields", body)
        state['fields'][f['id']] = res['id']
        new_inv = (res.get('options') or {}).get('inverseLinkFieldId')
        if inv and new_inv:
            rename = {'name': inv['name']}
            if inv.get('description'):
                rename['description'] = inv['description']
            at.call('PATCH', f"/meta/bases/{base}/tables/{state['tables'][it['id']]}/fields/{new_inv}", rename)
            state['fields'][inv['id']] = new_inv
        elif inv:
            # No field was added on the other side (can happen for a table linked to itself): create it on its own
            body = {'name': inv['name'], 'type': 'multipleRecordLinks',
                    'options': {'linkedTableId': state['tables'][inv['options']['linkedTableId']]}}
            res = at.call('POST', f"/meta/bases/{base}/tables/{state['tables'][it['id']]}/fields", body)
            state['fields'][inv['id']] = res['id']
            state.setdefault('extraOwners', []).append(inv['id'])
        save()
        print('Link', f"{t['name']}.{f['name']}", flush=True)
    owner_ids = {f['id'] for _, f, _, _ in owners} | set(state.get('extraOwners', []))

    # 4. Records (everything except links)
    failures = []

    def value(f, v):
        if f['type'] in COMPUTED:  # a computed primary, now a plain field
            if PRIMARY_AS[f['type']] == 'number':
                return v if isinstance(v, (int, float)) else None
            if isinstance(v, list):
                return ', '.join(str(x.get('name', x) if isinstance(x, dict) else x) for x in v)
            return v if PRIMARY_AS[f['type']] == 'dateTime' else str(v)
        if f['type'] == 'multipleAttachments':
            return [{'url': a['url'], 'filename': a.get('filename')} for a in v] if args.with_attachments else None
        if f['type'] in ('singleCollaborator',):
            return {'email': v.get('email')} if isinstance(v, dict) else None
        if f['type'] in ('multipleCollaborators',):
            return [{'email': c.get('email')} for c in v]
        if f['type'] == 'barcode':
            return {'text': v.get('text')} if isinstance(v, dict) else v
        return v

    with rec_log.open('a') as log:
        for t in tables:
            new_tid = state['tables'][t['id']]
            fmap = {f['name']: f for f in t['fields'] if creatable(f, t['primaryFieldId'])}
            todo = [r for r in records[t['id']] if r['id'] not in rec_map]
            for i in range(0, len(todo), 10):
                batch = todo[i:i + 10]
                rows = []
                for r in batch:
                    fields = {}
                    for name, v in r['fields'].items():
                        f = fmap.get(name)
                        if f and f['id'] in state['fields']:
                            v = value(f, v)
                            if v is not None and v != []:
                                fields[state['fields'][f['id']]] = v
                    rows.append({'fields': fields})
                try:
                    res = at.call('POST', f'/{base}/{new_tid}', {'records': rows, 'typecast': True})
                    pairs = {r['id']: n['id'] for r, n in zip(batch, res['records'])}
                except ApiError:
                    pairs = {}
                    for r, row in zip(batch, rows):  # one by one, to find the bad record
                        try:
                            res = at.call('POST', f'/{base}/{new_tid}', {'records': [row], 'typecast': True})
                            pairs[r['id']] = res['records'][0]['id']
                        except ApiError as e:
                            failures.append((t['name'], r['id'], str(e)))
                rec_map.update(pairs)
                log.write(json.dumps(pairs) + '\n')
                log.flush()
            print('Records', t['name'], len(records[t['id']]), flush=True)

    # 5. Links, now that every record has its new ID
    link_misses = 0
    for t in tables:
        if t['id'] in state['linksWritten']:
            continue
        links = [f for f in t['fields'] if f['id'] in owner_ids]
        if not links:
            continue
        new_tid = state['tables'][t['id']]
        rows = []
        for r in records[t['id']]:
            if r['id'] not in rec_map:
                continue
            fields = {}
            for f in links:
                old = r['fields'].get(f['name']) or []
                new = [rec_map[x] for x in old if x in rec_map]
                link_misses += len(old) - len(new)
                if new:
                    fields[state['fields'][f['id']]] = new
            if fields:
                rows.append({'id': rec_map[r['id']], 'fields': fields})
        for i in range(0, len(rows), 10):
            try:
                at.call('PATCH', f'/{base}/{new_tid}', {'records': rows[i:i + 10]})
            except ApiError as e:
                for row in rows[i:i + 10]:
                    failures.append((t['name'] + ' (links)', row['id'], str(e)))
        state['linksWritten'].append(t['id'])
        save()
        print('Links', t['name'], len(rows), flush=True)

    # 6. Results
    (backup / 'record-id-map.json').write_text(json.dumps(
        {'base': base, 'records': rec_map, 'tables': state['tables'], 'fields': state['fields']}, indent=1))
    write_report(backup, tables, records, owners, failures, link_misses, base, args.with_attachments)
    print(f'Done: {len(rec_map)} of {total} records in {base}, {len(failures)} failures, {at.calls} API calls')
    print('See', backup / 'restore-report.md')


if __name__ == '__main__':
    main()
