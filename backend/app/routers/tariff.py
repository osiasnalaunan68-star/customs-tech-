from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.core.database import get_admin

router = APIRouter()

@router.get("/chapters")
def list_chapters():
    sb = get_admin()
    return sb.table('tariff_chapters').select(
        'chapter_no,chapter_title,section_no,section_title'
    ).order('chapter_no').execute().data

@router.get("/codes")
def search_codes(
    q: Optional[str] = Query(None),
    code_prefix: Optional[str] = Query(None),
    chapter: Optional[int] = Query(None),
    code: Optional[str] = Query(None),
    year: int = Query(2026),
    limit: int = Query(50, le=200),
):
    sb = get_admin()
    query = sb.table('hs_codes').select(
        'id,ahtn_code,description,indent_level,is_quota,quota_type,chapter_no,footnote'
    )
    if chapter:
        query = query.eq('chapter_no', chapter)
    if code:
        query = query.eq('ahtn_code', code)
    elif code_prefix:
        query = query.like('ahtn_code', f'{code_prefix}%')
    elif q:
        query = query.ilike('description', f'%{q}%')
    res = query.order('ahtn_code').limit(limit).execute()
    if not res.data:
        return []
    ids = [r['id'] for r in res.data]
    rr = sb.table('tariff_rates').select('hs_code_id,rate').in_(
        'hs_code_id', ids).eq('year', year).execute()
    rm = {r['hs_code_id']: r['rate'] for r in rr.data}
    return [{**item, 'rate': rm.get(item['id']), 'year': year} for item in res.data]

@router.get("/code/{ahtn_code}")
def get_code(ahtn_code: str):
    sb = get_admin()
    res = sb.table('hs_codes').select('*,tariff_rates(year,rate)').eq(
        'ahtn_code', ahtn_code).execute()
    if not res.data:
        raise HTTPException(404, "HS code not found")
    return res.data[0]

@router.get("/footnote/{code}")
def get_footnote(code: str):
    sb = get_admin()
    res = sb.table('tariff_footnotes').select('*').eq('code', code).execute()
    return res.data[0] if res.data else {"error": "Not found"}
