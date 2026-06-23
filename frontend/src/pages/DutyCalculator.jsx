import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const fmt = n => (n||0).toLocaleString('en-PH',{minimumFractionDigits:2})

function computeIPF(cif_php) {
  if (cif_php <= 250000)  return 250
  if (cif_php <= 500000)  return 500
  if (cif_php <= 1000000) return 1000
  return 1500
}

const EMPTY = {
  fob:'', freight:'0', insurance:'0', exchange_rate:'',
  duty_rate:'', vat_rate:'12', aep:'1500', brokerage:'0'
}

const SEC = {
  fontSize:'11px',fontWeight:700,color:'var(--text3)',
  textTransform:'uppercase',letterSpacing:'.07em',
  margin:'4px 0 8px'
}

export default function DutyCalculator() {
  const [form, setForm]         = useState(EMPTY)
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [liveRate, setLiveRate] = useState(null)
  const [liveSrc, setLiveSrc]   = useState('')
  const [err, setErr]           = useState('')

  useEffect(() => {
    api.get('/calculator/exchange-rate')
      .then(d => { setLiveRate(d.rate); setLiveSrc(d.source) })
      .catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  async function calculate() {
    if (!form.fob || !form.duty_rate) {
      setErr('FOB Value and Duty Rate are required.'); return
    }
    setLoading(true); setErr('')
    try {
      const exr = parseFloat(form.exchange_rate) || liveRate || 56
      const data = await api.post('/calculator/duty', {
        fob:          parseFloat(form.fob)       || 0,
        freight:      parseFloat(form.freight)    || 0,
        insurance:    parseFloat(form.insurance)  || 0,
        exchange_rate: exr,
        duty_rate:    parseFloat(form.duty_rate)  || 0,
        vat_rate:     parseFloat(form.vat_rate)   || 12,
      })
      const ipf       = computeIPF(data.cif_php)
      const aep       = parseFloat(form.aep)       || 0
      const brokerage = parseFloat(form.brokerage) || 0
      setResult({
        ...data, ipf, aep, brokerage,
        grand_total: data.customs_duty + data.vat + ipf + aep + brokerage
      })
    } catch { setErr('Calculation failed. Check inputs or backend connection.') }
    setLoading(false)
  }

  return (
    <>
      <div className="card" style={{marginBottom:'16px'}}>
        <div className="card-h">
          <span className="card-t">Import Duty Calculator — CMTA / RA 10863</span>
          {liveRate && (
            <span style={{fontSize:'11px',color:liveSrc==='live'?'var(--success)':'var(--text3)'}}>
              {liveSrc==='live'?'🟢':'⚪'} ₱{liveRate}/USD
            </span>
          )}
        </div>
        {err && <div className="err">{err}</div>}

        <div style={SEC}>I. Dutiable Value (CIF Components)</div>
        <div className="frow frow3">
          <div className="fg">
            <label className="fl">FOB Value (USD) *</label>
            <input className="input" type="number" placeholder="0.00"
              value={form.fob} onChange={e=>set('fob',e.target.value)}/>
          </div>
          <div className="fg">
            <label className="fl">Freight (USD)</label>
            <input className="input" type="number"
              value={form.freight} onChange={e=>set('freight',e.target.value)}/>
          </div>
          <div className="fg">
            <label className="fl">Insurance (USD)</label>
            <input className="input" type="number"
              value={form.insurance} onChange={e=>set('insurance',e.target.value)}/>
          </div>
        </div>

        <div style={SEC}>II. Tax Rates</div>
        <div className="frow frow3">
          <div className="fg">
            <label className="fl">Exchange Rate (₱/USD)</label>
            <div style={{display:'flex',gap:'6px'}}>
              <input className="input" type="number"
                placeholder={liveRate ? String(liveRate) : '56.00'}
                value={form.exchange_rate}
                onChange={e=>set('exchange_rate',e.target.value)}
                style={{flex:1}}/>
              {liveRate && (
                <button className="btn btn-ghost btn-sm"
                  title="Use live BSP rate"
                  onClick={()=>set('exchange_rate',String(liveRate))}>↻</button>
              )}
            </div>
          </div>
          <div className="fg">
            <label className="fl">Duty Rate (%) *</label>
            <input className="input" type="number" placeholder="0"
              value={form.duty_rate} onChange={e=>set('duty_rate',e.target.value)}/>
          </div>
          <div className="fg">
            <label className="fl">VAT Rate (%)</label>
            <input className="input" type="number"
              value={form.vat_rate} onChange={e=>set('vat_rate',e.target.value)}/>
          </div>
        </div>

        <div style={SEC}>III. BOC &amp; Broker Charges</div>
        <div className="frow frow3">
          <div className="fg">
            <label className="fl">AEP — Arrastre + Exam + Wharfage (₱)</label>
            <input className="input" type="number"
              value={form.aep} onChange={e=>set('aep',e.target.value)}/>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}}>Default ₱1,500 — editable</div>
          </div>
          <div className="fg">
            <label className="fl">Brokerage Fee (₱)</label>
            <input className="input" type="number" placeholder="0.00"
              value={form.brokerage} onChange={e=>set('brokerage',e.target.value)}/>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}}>Optional</div>
          </div>
          <div className="fg">
            <label className="fl">IPF — Import Processing Fee</label>
            <div className="input" style={{
              background:'var(--surface2)',color:'var(--text3)',
              cursor:'not-allowed',userSelect:'none',display:'flex',
              alignItems:'center',fontSize:'12px'}}>
              Auto-computed from CIF (PHP)
            </div>
            <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}}>
              Per BOC CMO 26-2002
            </div>
          </div>
        </div>

        <div style={{display:'flex',gap:'10px',marginTop:'8px'}}>
          <button className="btn btn-primary" onClick={calculate} disabled={loading}>
            {loading ? 'Computing…' : '🧮 Compute Full Assessment'}
          </button>
          <button className="btn btn-ghost"
            onClick={()=>{setForm(EMPTY);setResult(null);setErr('')}}>
            Reset
          </button>
        </div>
      </div>
      <div className="card" style={{marginBottom:'16px'}}>
        <div className="card-h">
          <span className="card-t">📋 IPF Schedule — CMO 26-2002</span>
          <span style={{fontSize:'11px',color:'var(--text3)'}}>Applied automatically</span>
        </div>
        <div style={{border:'1px solid var(--border)',borderRadius:'var(--r)',overflow:'hidden'}}>
          {[
            ['CIF up to ₱250,000',           '₱250'],
            ['CIF ₱250,001 – ₱500,000',      '₱500'],
            ['CIF ₱500,001 – ₱1,000,000',    '₱1,000'],
            ['CIF over ₱1,000,000',           '₱1,500'],
          ].map(([range, fee], i) => (
            <div key={i} style={{
              display:'flex', justifyContent:'space-between',
              padding:'9px 16px', fontSize:'13px',
              borderBottom: i<3 ? '1px solid var(--border)' : 'none',
              background: i%2===0 ? 'var(--surface)' : 'var(--surface2)',
            }}>
              <span style={{color:'var(--text2)'}}>{range}</span>
              <span style={{fontWeight:700,color:'var(--accent)'}}>{fee}</span>
            </div>
          ))}
        </div>
      </div>

      {result && (
        <div className="card">
          <div className="card-h">
            <span className="card-t">Full BOC Assessment Breakdown</span>
            <span style={{fontSize:'11px',color:'var(--text3)'}}>CMTA / RA 10863</span>
          </div>
          <div className="result-box">

            <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',paddingBottom:'6px'}}>
              I. DUTIABLE VALUE (CIF)
            </div>
            <div className="result-row">
              <span>FOB Value</span><span>USD {fmt(result.fob_usd)}</span>
            </div>
            <div className="result-row">
              <span>+ Freight</span><span>USD {fmt(result.freight_usd)}</span>
            </div>
            <div className="result-row">
              <span>+ Insurance</span><span>USD {fmt(result.insurance_usd)}</span>
            </div>
            <div className="result-row" style={{fontWeight:600}}>
              <span>CIF (USD)</span><span>USD {fmt(result.cif_usd)}</span>
            </div>
            <div className="result-row">
              <span>× Exchange Rate</span><span>₱{result.exchange_rate}/USD</span>
            </div>
            <div className="result-row"
              style={{fontWeight:700,paddingBottom:'12px',borderBottom:'2px solid var(--border)'}}>
              <span>CIF Value (PHP)</span><span>₱{fmt(result.cif_php)}</span>
            </div>

            <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',padding:'10px 0 6px'}}>
              II. CUSTOMS TAXES
            </div>
            <div className="result-row">
              <span>Customs Duty ({result.duty_rate_pct}% × CIF PHP)</span>
              <span>₱{fmt(result.customs_duty)}</span>
            </div>
            <div className="result-row">
              <span>VAT Base (CIF + Customs Duty)</span>
              <span>₱{fmt(result.vat_base)}</span>
            </div>
            <div className="result-row"
              style={{paddingBottom:'12px',borderBottom:'2px solid var(--border)'}}>
              <span>VAT ({result.vat_rate_pct}% × VAT Base)</span>
              <span>₱{fmt(result.vat)}</span>
            </div>

            <div style={{fontSize:'10px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',padding:'10px 0 6px'}}>
              III. BOC &amp; BROKER CHARGES
            </div>
            <div className="result-row">
              <span>
                IPF — Import Processing Fee
                <span style={{fontSize:'11px',color:'var(--text3)',marginLeft:'8px'}}>
                  (CIF: ₱{fmt(result.cif_php)})
                </span>
              </span>
              <span>₱{fmt(result.ipf)}</span>
            </div>
            <div className="result-row">
              <span>AEP (Arrastre + Examination + Wharfage)</span>
              <span>₱{fmt(result.aep)}</span>
            </div>
            {result.brokerage > 0 && (
              <div className="result-row">
                <span>Brokerage Fee</span>
                <span>₱{fmt(result.brokerage)}</span>
              </div>
            )}

            <div className="result-row total"
              style={{marginTop:'10px',paddingTop:'12px',borderTop:'2px solid var(--accent)',fontSize:'16px'}}>
              <span>TOTAL ASSESSMENT PAYABLE</span>
              <span>₱{fmt(result.grand_total)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
