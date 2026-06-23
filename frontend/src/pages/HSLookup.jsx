import { useState, useEffect, useRef } from 'react'
import { api } from '../lib/api'

const BOC_CHIPS = [
  { label: '🌾 Rice (CMTA Sec. 709)', q: 'rice',          chapter: null },
  { label: '🚗 Motor Vehicles (Ch. 87)', q: null,         chapter: '87' },
  { label: '⚙️ Stainless Steel',        q: 'stainless',   chapter: null },
  { label: '🟢 SGL Items',              q: 'SGL',          chapter: null },
  { label: '🔧 CKD/SKD Parts',         q: 'knock-down',   chapter: null },
  { label: '🧵 Textiles',              q: 'textile',       chapter: null },
  { label: '🍗 Frozen Poultry',         q: 'frozen poultry', chapter: null },
  { label: '💊 Medicines (Ch. 30)',     q: null,           chapter: '30' },
  { label: '📱 Electronics (Ch. 85)',   q: null,           chapter: '85' },
  { label: '🐟 Fish & Seafood (Ch. 3)', q: null,          chapter: '3' },
]

const isCodeQuery = q => /^\d[\d.]*$/.test(q.trim())

export default function HSLookup() {
  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [chapters, setChapters] = useState([])
  const [chapter, setChapter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [err, setErr]         = useState('')
  const [searched, setSearched] = useState(false)
  const [activeChip, setActiveChip] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    api.get('/tariff/chapters').then(setChapters).catch(() => {})
  }, [])

  async function search(query, ch, chipLabel) {
    setLoading(true); setErr(''); setSearched(true)
    setActiveChip(chipLabel || null)
    try {
      const p = new URLSearchParams()
      if (query) {
        isCodeQuery(query)
          ? p.set('code_prefix', query.trim())
          : p.set('q', query.trim())
      }
      if (ch) p.set('chapter', ch)
      p.set('limit', '80')
      const data = await api.get(`/tariff/codes?${p}`)
      setResults(data)
    } catch {
      setErr('Search failed — check backend connection.')
      setResults([])
    }
    setLoading(false)
  }

  function onInput(v) {
    setQ(v); setActiveChip(null)
    clearTimeout(timer.current)
    if (!v && !chapter) { setResults([]); setSearched(false); return }
    timer.current = setTimeout(() => search(v, chapter), 420)
  }

  function onChapter(v) { setChapter(v); search(q, v) }

  function applyChip(chip) {
    if (chip.chapter) {
      setQ(''); setChapter(chip.chapter)
      search('', chip.chapter, chip.label)
    } else {
      setQ(chip.q); setChapter('')
      search(chip.q, '', chip.label)
    }
  }

  async function viewRates(code) {
    try { setSelected(await api.get(`/tariff/code/${code}`)) } catch {}
  }

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  const indent = l => l >= 4 ? 'i4' : l >= 3 ? 'i3' : l >= 2 ? 'i2' : l >= 1 ? 'i1' : ''
  const codeMode = isCodeQuery(q)

  return (
    <>
      <div className="card" style={{marginBottom:'16px'}}>
        <div className="card-h">
          <span className="card-t">HS Code Lookup — AHTN 2022</span>
          <span style={{fontSize:'11px',color:'var(--text3)',fontFamily:'monospace'}}>11,006 entries • PH BOC</span>
        </div>

        <div className="frow frow2" style={{marginBottom:'12px'}}>
          <div className="fg" style={{margin:0}}>
            <label className="fl">
              {codeMode ? '🔢 Code / Heading Search' : '🔍 Description Search'}
            </label>
            <div className="search-wrap">
              <span className="si">🔍</span>
              <input className="input" value={q}
                placeholder="Keyword (e.g. rice) or code (e.g. 0101, 8703)"
                onChange={e => onInput(e.target.value)}/>
            </div>
            {codeMode && q && (
              <div style={{fontSize:'11px',color:'var(--accent)',marginTop:'4px'}}>
                ⚡ Code mode — showing entries starting with "{q}"
              </div>
            )}
          </div>
          <div className="fg" style={{margin:0}}>
            <label className="fl">Chapter Filter</label>
            <select className="input" value={chapter} onChange={e => onChapter(e.target.value)}>
              <option value="">All Chapters (1–97)</option>
              {chapters.map(c => (
                <option key={c.chapter_no} value={c.chapter_no}>
                  Ch.{String(c.chapter_no).padStart(2,'0')} — {c.chapter_title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="fl" style={{marginBottom:'8px'}}>⚡ BOC Quick Search</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
            {BOC_CHIPS.map((chip,i) => {
              const active = activeChip === chip.label
              return (
                <button key={i} onClick={() => applyChip(chip)} style={{
                  padding:'4px 12px',borderRadius:'14px',fontSize:'12px',fontWeight:600,
                  cursor:'pointer',fontFamily:'inherit',transition:'all .15s',whiteSpace:'nowrap',
                  border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                  background: active ? 'var(--accent-bg)' : 'var(--surface2)',
                  color: active ? 'var(--accent)' : 'var(--text2)',
                }}>
                  {chip.label}
                </button>
              )
            })}
          </div>
        </div>
        {err && <div className="err" style={{marginTop:'12px'}}>{err}</div>}
      </div>

      {selected && (
        <div className="card" style={{marginBottom:'16px',borderColor:'var(--accent)'}}>
          <div className="card-h">
            <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
              <span className="code" style={{fontSize:'15px'}}>{selected.ahtn_code}</span>
              {selected.is_quota && (
                <span className={`tag ${selected.quota_type==='in_quota'?'tag-in':'tag-out'}`}>
                  {selected.quota_type==='in_quota'?'In-Quota':'Out-Quota'}
                </span>
              )}
              {selected.footnote && (
                <span style={{fontSize:'11px',color:'var(--warn)'}}>⚠ {selected.footnote}</span>
              )}
            </div>
            <div style={{display:'flex',gap:'6px'}}>
              <button className="btn btn-ghost btn-sm"
                onClick={() => copyToClipboard(selected.ahtn_code)}
                title="Copy code">📋</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
          </div>
          <p style={{color:'var(--text2)',marginBottom:'16px',lineHeight:1.7}}>{selected.description}</p>
          <div className="fl" style={{marginBottom:'8px'}}>MFN Rates of Duty — 2024 to 2028</div>
          <div className="tw">
            <table>
              <thead><tr><th>Year</th><th>Rate</th><th></th></tr></thead>
              <tbody>
                {(selected.tariff_rates||[]).sort((a,b)=>a.year-b.year).map(r=>(
                  <tr key={r.year}>
                    <td style={{fontWeight:600}}>{r.year}</td>
                    <td style={{fontWeight:r.year===2026?700:400,color:r.year===2026?'var(--accent)':undefined}}>
                      {r.rate}%
                    </td>
                    <td style={{fontSize:'11px',color:'var(--text3)'}}>
                      {r.year===2026?'← Current (2026)':''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-h">
          <span className="card-t">
            {loading ? 'Searching…' : searched ? `${results.length} result${results.length!==1?'s':''} found` : 'Results'}
          </span>
          {searched && results.length===80 && (
            <span style={{fontSize:'11px',color:'var(--warn)'}}>⚠ Showing first 80 — refine search</span>
          )}
        </div>

        {loading ? (
          <div className="loading"><div className="spin"/></div>
        ) : !searched ? (
          <div className="empty">
            <div style={{fontSize:'28px',marginBottom:'8px'}}>🔍</div>
            <div>Type a keyword, enter a code prefix, or click a BOC chip above</div>
          </div>
        ) : results.length===0 ? (
          <div className="empty">No results — try a different keyword</div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>AHTN Code</th>
                  <th>Description</th>
                  <th style={{textAlign:'center'}}>2026 Rate</th>
                  <th style={{textAlign:'center'}}>Quota</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id||r.ahtn_code}>
                    <td><span className="code">{r.ahtn_code}</span></td>
                    <td className={indent(r.indent_level||0)} style={{maxWidth:'300px'}}>{r.description}</td>
                    <td style={{textAlign:'center',fontWeight:700,color:'var(--accent)'}}>
                      {r.rate!=null?`${r.rate}%`:'—'}
                    </td>
                    <td style={{textAlign:'center'}}>
                      {r.quota_type
                        ? <span className={`tag ${r.quota_type==='in_quota'?'tag-in':'tag-out'}`}>
                            {r.quota_type==='in_quota'?'In-Q':'Out-Q'}
                          </span>
                        : '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewRates(r.ahtn_code)}>
                        Rates ▸
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
