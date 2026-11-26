# API keys: AIRTABLE_API_KEY and AIRTABLE_BASE_ID are read from lambda/.env (not committed), unless already set in the environment.
"""Read-only backup of the Airtable base: GET requests only, nothing in Airtable is changed.

Usage: python3 scripts/airtable-backup.py [output-dir]
Default output: ~/airtable-backups/<today>/ (outside the repo: the data holds passwords and ID numbers).
Writes schema.json plus one <tableId>.json per table. Attachments are saved as Airtable links only,
which expire after a few hours.
"""
import datetime, json, os, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path

ENV_FILE = Path(__file__).resolve().parent.parent / 'lambda' / '.env'
if ENV_FILE.exists():
    for line in ENV_FILE.read_text().splitlines():
        name, sep, value = line.strip().partition('=')
        if sep and not name.startswith('#'):
            os.environ.setdefault(name.strip(), value.strip())

key = os.environ['AIRTABLE_API_KEY']
base = os.environ['AIRTABLE_BASE_ID']
out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'airtable-backups' / datetime.date.today().isoformat()
os.umask(0o077)
out.mkdir(parents=True, exist_ok=True)


def get(url):
    for _ in range(5):
        req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + key})
        try:
            with urllib.request.urlopen(req) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:  # Airtable rate limit: wait and retry
                time.sleep(30)
                continue
            raise
    raise RuntimeError('rate limited')


schema = get(f'https://api.airtable.com/v0/meta/bases/{base}/tables')
json.dump(schema, open(out / 'schema.json', 'w'), ensure_ascii=False, indent=1)
total = 0
for t in schema['tables']:
    recs, offset = [], None
    while True:
        q = {'pageSize': '100'}
        if offset:
            q['offset'] = offset
        d = get(f"https://api.airtable.com/v0/{base}/{t['id']}?" + urllib.parse.urlencode(q))
        recs += d['records']
        offset = d.get('offset')
        time.sleep(0.25)  # stay under 5 requests per second
        if not offset:
            break
    json.dump({'table': t['name'], 'id': t['id'], 'records': recs}, open(out / f"{t['id']}.json", 'w'), ensure_ascii=False, indent=1)
    print(t['id'], t['name'], len(recs), flush=True)
    total += len(recs)
print('total', total, 'records in', out)
