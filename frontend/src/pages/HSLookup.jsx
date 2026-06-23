import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'
export default function HSLookup() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [chapters, setChapters] = useState([])
  const [chapter, setChapter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [err, setErr] = useState('')
  const timer = useRef(null)
  useEffect(()=>{ api.get('/tariff/chapters').then(setChapters).catch(()=>{}) },[])
  async function search(query, ch) {
    setLoading(true); setErr('')
    try {
      const p = new URLSearchParams()
      if (query) p.set('q', query)
      if (ch) p.set('chapter', ch)
      p.set('limit','50')
      setResults(await api.get(`/tariff/codes?${p}`))
    } catch(e) { setErr('Search failed. Is the backend running?'); setResults([]) }
    setLoading(false)
  }
  function onQ(v) { setQ(v); clearTimeout(timer.current); timer.current=setTimeout(()=>search(v,chapter),500) }
  function onCh(v) { setChapter(v); search(q,v) }
  async function view(code) {
    try { setSelected(await api.get(`/tariff/code/${code}`)) } catch(e) {}
  }
  const ic = l => l>=4?'i4':l>=3?'i3':l>=2?'i2':l>=1?'i1':''
  return (
    <>
      <div className="card" style={{marginBottom:'16px'}}>
        <div className="frow frow2">
          <div className="fg" style={{margin:0}}>
            <label className="fl">Search Description / Code</label>
            <div className="search-wrap"><span className="si">🔍</span>
              <input className="input" placeholder="e.g. rice, motor vehicle, steel..." value={q} onChange={e=>onQ(e.target.value)}/></div>
          </div>
          <div className="fg" style={{margin:0}}>
            <label className="fl">Filter by Chapter</label>
            <select className="input" value={chapter} onChange={e=>onCh(e.target.value)}>
              <option value="">All Chapters</option>
              {chapters.map(c=><option key={c.chapter_no} value={c.chapter_no}>Ch.{c.chapter_no} — {c.chapter_title}</option>)}
            </select>
          </div>
        </div>
        {err && <div className="err" style={{marginTop:'12px'}}>{err}</div>}
      </div>
      {selected && (
        <div className="card" style={{marginBottom:'16px',borderColor:'var(--accent)'}}>
          <div className="card-h">
            <span className="card-t">📋 {selected.ahtn_code}</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(null)}>✕</button>
          </div>
          <p style={{color:'var(--text2)',marginBottom:'12px'}}>{selected.description}</p>
          {selected.is_quota&&<span className={`tag ${selected.quota_type==='in_quota'?'tag-in':'tag-out'}`} style={{marginBottom:'12px',display:'inline-flex'}}>{selected.quota_type}</span>}
          <div className="tw"><table>
            <thead><tr><th>Year</th><th>MFN Rate (%)</th></tr></thead>
            <tbody>{(selected.tariff_rates||[]).sort((a,b)=>a.year-b.year).map(r=>(
              <tr key={r.year}><td>{r.year}</td>
                <td style={{fontWeight:r.year===2026?700:400,color:r.year===2026?'var(--accent)':undefined}}>{r.rate}%</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
      <div className="card">
        <div className="card-h"><span className="card-t">{results.length>0?`${results.length} results`:'Browse HS Codes'}</span></div>
        {loading?<div className="loading"><div className="spin"/></div>:results.length===0?(
          <div className="empty">Type a keyword or select a chapter to start</div>
        ):(
          <div className="tw"><table>
            <thead><tr><th>AHTN Code</th><th>Description</th><th>Quota</th><th></th></tr></thead>
            <tbody>{results.map(r=>(
              <tr key={r.id}>
                <td><span className="code">{r.ahtn_code}</span></td>
                <td className={ic(r.indent_level||0)}>{r.description}</td>
                <td>{r.quota_type?<span className={`tag ${r.quota_type==='in_quota'?'tag-in':'tag-out'}`}>{r.quota_type}</span>:'—'}</td>
                <td><button className="btn btn-ghost btn-sm" onClick={()=>view(r.ahtn_code)}>Rates ▸</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
