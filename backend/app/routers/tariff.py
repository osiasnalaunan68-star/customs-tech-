from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from app.core.database import get_admin

router = APIRouter()

@router.get("/chapters")
def list_chapters():
    sb = get_admin()
    return sb.table('tariff_chapters').select('*').order('chapter_no').execute().data

@router.get("/codes")
def search_codes(
    q: Optional[str] = Query(None, description="Search keyword"),
    chapter: Optional[int] = Query(None),
    code: Optional[str] = Query(None, description="Exact 8-digit code"),
    limit: int = Query(50, le=200)
):
    sb = get_admin()
    query = sb.table('hs_codes').select('*, tariff_chapters!inner(*)')
    if chapter:
        query = query.eq('chapter_no', chapter)
    if code:
        query = query.eq('ahtn_code', code)
    if q:
        query = query.ilike('description', f'%{q}%')
    return query.limit(limit).execute().data

@router.get("/code/{ahtn_code}")
def get_code(ahtn_code: str):
    sb = get_admin()
    res = sb.table('hs_codes').select('*, tariff_rates(*)').eq('ahtn_code', ahtn_code).execute()
    if not res.data:
        raise HTTPException(404, "HS code not found")
    return res.data[0]

@router.get("/rates/{ahtn_code}")
def get_rates(ahtn_code: str, year: Optional[int] = None):
    sb = get_admin()
    query = sb.table('tariff_rates').select('*, hs_codes(ahtn_code, description)').eq('hs_codes.ahtn_code', ahtn_code)
    if year:
        query = query.eq('year', year)
    return query.execute().data
