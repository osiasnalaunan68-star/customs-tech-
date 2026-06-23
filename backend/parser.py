#!/usr/bin/env python3
import re, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))
from core.config import SUPABASE_URL, SUPABASE_SERVICE_KEY
from supabase import create_client

DATA = os.path.join(os.path.dirname(__file__), 'data', 'ph_tariff_organized.txt')
BS   = 40

CHAP_RE = re.compile(r'^---\s*CHAPTER\s+(\d+)\s*---', re.I)
NUM_RE  = re.compile(r'^\d+(?:\.\d+)?$')
CODE_RE = re.compile(r'^\d{4}\.\d{2}\.\d{2}(?:\.\d{3})?$')
FN_RE   = re.compile(r'^(a\d+\w*|/[a-z])\s+(.+)', re.I)
SKIP_RE = re.compile(r'^(MFN Rates|Hdg\.|No\.\s*Code|\(1\)|Starting|01 Jan|22 Jul|21 Jul|31 Dec|\d{1,3}$)')

def clean(raw): return re.sub(r'^[-\s]+', '', raw).strip()
def indent(raw):
    m = re.match(r'^((?:-\s*)+)', raw)
    return m.group(1).count('-') if m else 0
def quota(code, desc):
    if code.endswith('.100') or 'In-Quota' in desc: return 'in_quota'
    if code.endswith('.200') or 'Out-Quota' in desc: return 'out_quota'
    return None

def parse(fp):
    chaps, entries, fns = {}, [], {}
    ch = None
    for line in open(fp, encoding='utf-8', errors='replace'):
        s = line.strip()
        if not s or SKIP_RE.match(s): continue
        m = CHAP_RE.match(s)
        if m:
            ch = int(m.group(1))
            chaps[ch] = {'chapter_no': ch, 'section_no': None, 'section_title': None,
                         'chapter_title': f'Chapter {ch}', 'chapter_notes': ''}
            continue
        m = FN_RE.match(s)
        if m and not s[:1].isdigit():
            fns[m.group(1)] = m.group(2); continue
        if not s[:4].replace('.', '').isdigit(): continue
        parts = s.split()
        fn = parts.pop() if parts and re.match(r'^(a\d+\w*|/[a-z])$', parts[-1], re.I) else None
        nums = []
        while parts and NUM_RE.match(parts[-1]): nums.insert(0, float(parts.pop()))
        while len(nums) < 6: nums.insert(0, None)
        code = parts[0] if parts else ''
        if not CODE_RE.match(code): continue
        raw = ' '.join(parts[1:])
        desc = clean(raw)
        qt = quota(code, desc)
        entries.append({'ahtn_code': code, 'description': desc,
                        'indent_level': indent(raw), 'is_quota': qt is not None,
                        'quota_type': qt, 'footnote': fn,
                        'chapter_no': ch, 'rates': nums[-6:]})
    return chaps, entries, fns

def upload(chaps, entries, fns):
    sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print(f"Chapters:{len(chaps)} Codes:{len(entries)} Footnotes:{len(fns)}")
    print("Clearing old data...")
    sb.table('hs_codes').delete().gte('id', 0).execute()
    sb.table('tariff_chapters').delete().gte('id', 0).execute()
    sb.table('tariff_footnotes').delete().gte('id', 0).execute()
    print("Inserting chapters...")
    cl = list(chaps.values())
    for i in range(0, len(cl), BS):
        sb.table('tariff_chapters').insert(cl[i:i+BS]).execute()
    if fns:
        print("Inserting footnotes...")
        fl = [{'code': k, 'note': v} for k, v in fns.items()]
        for i in range(0, len(fl), BS):
            sb.table('tariff_footnotes').insert(fl[i:i+BS]).execute()
    print("Inserting HS codes + rates...")
    YRS = [2024, 2025, 2026, 2027, 2028]
    IDX = [0, 2, 3, 4, 5]
    for i in range(0, len(entries), BS):
        b = entries[i:i+BS]
        hs = [{k: v for k, v in e.items() if k != 'rates'} for e in b]
        res = sb.table('hs_codes').insert(hs).execute()
        im = {r['ahtn_code']: r['id'] for r in res.data}
        rr = [{'hs_code_id': im[e['ahtn_code']], 'year': y, 'rate': (e['rates'][IDX[j]] or 0.0)}
              for e in b if e['ahtn_code'] in im for j, y in enumerate(YRS)]
        if rr: sb.table('tariff_rates').insert(rr).execute()
        print(f"  {min(i+BS, len(entries))}/{len(entries)}", end='\r')
    print(f"\n✅ Done! {len(entries)} HS codes loaded.")

if __name__ == '__main__':
    if not os.path.exists(DATA):
        print(f"❌ Not found: {DATA}"); sys.exit(1)
    print("Parsing tariff file...")
    c, e, f = parse(DATA)
    print("Uploading to Supabase...")
    upload(c, e, f)
