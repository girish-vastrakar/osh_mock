"""Pull usage messages from the ntfy.sh topic and apply them to data.csv (run by the collect-stats workflow).
Messages are JSON: {"rows": [...]} adds rows, {"delete": {"device_id", "learner_id"?}} removes a learner's
(or a whole device's) rows. state.json remembers the last message id so nothing is applied twice."""
import csv, io, json, os, re, sys, urllib.request

TOPIC = os.environ.get('NTFY_TOPIC', 'osh-mock-stats-1b65fc50dab5c24e')
DIR = sys.argv[1] if len(sys.argv) > 1 else '.'
DATA, STATE = os.path.join(DIR, 'data.csv'), os.path.join(DIR, 'state.json')
COLS = ['ts', 'event', 'device_id', 'learner_id', 'app_version', 'os', 'browser', 'device_type', 'installed', 'screen', 'lang',
        'cert_class', 'mineral', 'attempts_so_far', 'days_since_signup', 'mode', 'paper', 'drill_area',
        'questions', 'right', 'wrong', 'skipped', 'net_score', 'accuracy_pct', 'passed', 'minutes', 'topic_scores']
ID = re.compile(r'^[A-Za-z0-9-]{6,64}$')

def fetch(since):
    src = os.environ.get('NTFY_FILE')  # for local tests
    if src: body = open(src, encoding='utf-8').read()
    else:
        url = f'https://ntfy.sh/{TOPIC}/json?poll=1&since={since}'
        body = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'osh-mock-stats-collector'}), timeout=60).read().decode('utf-8')
    return [m for m in (json.loads(l) for l in body.splitlines() if l.strip()) if m.get('event') == 'message']

def cell(v):
    if v is None: return ''
    s = re.sub(r'[\r\n]+', ' ', str(v))[:300]
    if re.match(r'^[=+\-@]', s):
        try: float(s)
        except ValueError: s = "'" + s  # stop spreadsheet formula injection
    return s

def to_row(r):
    row = {c: cell(r.get(c)) for c in COLS}
    tops = r.get('topics') if isinstance(r.get('topics'), list) else []
    row['topic_scores'] = '; '.join(f"{re.sub(r'[;:]', ' -', str(t.get('area', '')))}:{int(t.get('right') or 0)}/{int(t.get('questions') or 0)}"
                                    for t in tops[:20] if isinstance(t, dict))
    return row

state = json.load(open(STATE)) if os.path.exists(STATE) else {'last_id': None}
rows = list(csv.DictReader(open(DATA, encoding='utf-8'))) if os.path.exists(DATA) else []
msgs = fetch(state['last_id'] or '24h')
added = removed = 0
for m in msgs:
    try: body = json.loads(m.get('message') or '{}')
    except ValueError: continue
    if not isinstance(body, dict): continue
    d = body.get('delete')
    if isinstance(d, dict) and ID.match(str(d.get('device_id', ''))):
        lid = d.get('learner_id') if ID.match(str(d.get('learner_id', ''))) else None
        keep = [x for x in rows if not (x['device_id'] == d['device_id'] and (lid is None or x['learner_id'] == lid))]
        removed += len(rows) - len(keep); rows = keep
    for r in (body.get('rows') or [])[:100]:
        if isinstance(r, dict) and ID.match(str(r.get('device_id', ''))) and ID.match(str(r.get('learner_id') or r.get('device_id'))):
            rows.append(to_row(r)); added += 1
if msgs: state['last_id'] = msgs[-1]['id']
out = io.StringIO(); w = csv.DictWriter(out, fieldnames=COLS, extrasaction='ignore', lineterminator='\n'); w.writeheader(); w.writerows(rows)
open(DATA, 'w', encoding='utf-8').write(out.getvalue())
json.dump(state, open(STATE, 'w'), indent=1)
print(f'messages {len(msgs)}, added {added}, removed {removed}, total rows {len(rows)}')
