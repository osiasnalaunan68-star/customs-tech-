import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { calculateAssessment, ValuationError, formatPHP, formatUSD } from '../lib/ValuationEngine'

const EMPTY = {
  fob:'', freight:'0', insurance:'0', exchange_rate:'',
  duty_rate:'', aep:'1500', brokerage:'0', isExcise: false
}

const SEC = {
  fontSize:'11px',fontWeight:700,color:'var(--text3)',
  textTransform:'uppercase',letterSpacing:'.07em',
  margin:'4px 0 8px'
}

export default function DutyCalculator() {
  const [form, setForm]         = useState(EMPTY)
  const [result, setResult]     = useState(null)
  const [liveRate, setLiveRate] = useState(null)
  const [liveSrc, setLiveSrc]   = useState('')
  const [err, setErr]           = useState('')

  useEffect(() => {
    api.get('/calculator/exchange-rate')
      .then(d => { setLiveRate(d.rate); setLiveSrc(d.source) })
      .catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  function calculate() {
    setErr(''); setResult(null)
    try {
      const res = calculateAssessment({
        fob:          form.fob,
        freight:      form.freight,
        insurance:    form.insurance,
        exchangeRate: form.exchange_rate || liveRate || 56,
        tariffRate:   form.duty_rate,
        aep:          form.aep,
        brokerageFee: form.brokerage,
        isExcise:     form.isExcise
      })
      setResult(res)
    } catch (e) {
      if (e instanceof ValuationError) setErr(e.errors.join(' | '))
      else setErr('Calculation Error: ' + e.message)
    }
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
        {err && <div className="err" style={{background:'#fee2e2',color:'#991b1b',padding:'10px',borderRadius:'4px',marginBottom:'12px',fontSize:'13px'}}>{err}</div>}

        <div style={SEC}>I. Dutiable Value (CIF Components)</div>
        <div className="frow frow3">
          <div className="fg">
            <label className="fl">FOB Value (USD) *</label>
            <input className="input" type="number" placeholder="0.00" value={form.fob} onChange={e=>set('fob',e.target.value)}/>
          </div>
          <div className="fg">
            <label className="fl">Freight (USD)</label>
            <input className="input" type="number" value={form.freight} onChange={e=>set('freight',e.target.value)}/>
          </div>
          <div className="fg">
            <label className="fl">Insurance (USD)</label>
            <input className="input" type="number" value={form.insurance} onChange={e=>set('insurance',e.target.value)}/>
            <div style={{fontSize:'10px',color:'var(--text3)',marginTop:'3px'}}>Leave blank for 2% auto-compute</div>
          </div>
        </div>

        <div style={SEC}>II. Tax Rates & Classification</div>
        <div className="frow frow3">
          <div className="fg">
            <label className="fl">Exchange Rate (₱/USD)</label>
            <div style={{display:'flex',gap:'6px'}}>
              <input className="input" type="number" placeholder={liveRate ? String(liveRate) : '56.00'} value={form.exchange_rate} onChange={e=>set('exchange_rate',e.target.value)} style={{flex:1}}/>
              {liveRate && <button className="btn btn-ghost btn-sm" title="Use live BSP rate" onClick={()=>set('exchange_rate',String(liveRate))}>↻</button>}
            </div>
          </div>
          <div className="fg">
            <label className="fl">MFN Duty Rate (%) *</label>
            <input className="input" type="number" placeholder="0" value={form.duty_rate} onChange={e=>set('duty_rate',e.target.value)}/>
          </div>
          <div className="fg" style={{display:'flex', alignItems:'center', gap:'8px', paddingTop:'26px'}}>
            <input type="checkbox" checked={form.isExcise} onChange={e=>set('isExcise',e.target.checked)} style={{width:'16px',height:'16px'}}/>
            <label style={{fontSize:'13px',fontWeight:600,color:'var(--text2)',cursor:'pointer'}} onClick={()=>set('isExcise',!form.isExcise)}>Excise Goods (NIRC)</label>
          </div>
        </div>

        <div style={SEC}>III. BOC &amp; Broker Charges</div>
        <div className="frow frow3">
          <div className="fg">
            <label className="fl">AEP — Arrastre + Exam + Wharfage (₱)</label>
            <input className="input" type="number" value={form.aep} onChange={e=>set('aep',e.target.value)}/>
          </div>
          <div className="fg">
            <label className="fl">Brokerage Fee (₱)</label>
            <input className="input" type="number" placeholder="0.00" value={form.brokerage} onChange={e=>set('brokerage',e.target.value)}/>
          </div>
          <div className="fg">
            <label className="fl">IPF, CDS & DST</label>
            <div className="input" style={{background:'var(--surface2)',color:'var(--text3)',cursor:'not-allowed',fontSize:'12px',display:'flex',alignItems:'center'}}>
              Automatically injected by Engine
            </div>
          </div>
        </div>

        <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
          <button className="btn btn-primary" onClick={calculate}>🧮 Compute Strict Assessment</button>
          <button className="btn btn-ghost" onClick={()=>{setForm(EMPTY);setResult(null);setErr('')}}>Reset</button>
        </div>
      </div>

      {result && (
        <div className="card">
          <div className="card-h">
            <span className="card-t">Valuation Engine Breakdown</span>
            <span style={{fontSize:'11px',color:'var(--success)',fontWeight:700}}>✓ CMTA SEC 700 Compliant</span>
          </div>

          {result.warnings.length > 0 && (
            <div style={{background:'#fef9c3',border:'1px solid #fde047',color:'#854d0e',padding:'10px',borderRadius:'4px',marginBottom:'16px',fontSize:'12px',fontWeight:600}}>
              {result.warnings.map((w,i)=><div key={i}>⚠ {w}</div>)}
            </div>
          )}

          <div className="result-box">
            <div style={SEC}>I. DUTIABLE VALUE (CIF)</div>
            <div className="result-row"><span>FOB Value</span><span>{formatUSD(result.inputs.fobUsd)}</span></div>
            <div className="result-row"><span>+ Freight</span><span>{formatUSD(result.inputs.freightUsd)}</span></div>
            <div className="result-row"><span>+ Insurance</span><span>{formatUSD(result.inputs.insuranceUsd)}</span></div>
            <div className="result-row" style={{fontWeight:600}}><span>CIF (USD)</span><span>{formatUSD(result.inputs.cifUsd)}</span></div>
            <div className="result-row"><span>× Exchange Rate</span><span>₱{result.inputs.exchangeRate}/USD</span></div>
            <div className="result-row" style={{color:'var(--text3)'}}><span>CIF Value (PHP Raw)</span><span>{formatPHP(result.breakdown.cifPhpRaw)}</span></div>
            <div className="result-row" style={{fontWeight:700,color:'var(--accent)',paddingBottom:'12px',borderBottom:'2px solid var(--border)'}}>
              <span>ROUNDED DUTIABLE VALUE [Math.ceil]</span><span>{formatPHP(result.breakdown.dvPesos)}</span>
            </div>

            <div style={{...SEC, marginTop:'12px'}}>II. TAX COMPUTATION</div>
            <div className="result-row"><span>Customs Duty ({result.inputs.tariffRate}%)</span><span>{result.isDeMinimis?'EXEMPT':formatPHP(result.breakdown.duty)}</span></div>
            <div className="result-row"><span>Excise Tax</span><span>{formatPHP(result.breakdown.exciseTax)}</span></div>
            <div className="result-row"><span>IPF (Import Processing Fee)</span><span>{formatPHP(result.breakdown.ipf)}</span></div>
            <div className="result-row"><span>AEP (Port Charges)</span><span>{formatPHP(result.breakdown.aep)}</span></div>
            <div className="result-row"><span>CDS + DST (Fixed Stamps)</span><span>{formatPHP(result.breakdown.cds + result.breakdown.dst)}</span></div>
            {result.breakdown.brokerageFee > 0 && <div className="result-row"><span>Brokerage Fee</span><span>{formatPHP(result.breakdown.brokerageFee)}</span></div>}
            
            <div className="result-row" style={{color:'var(--text3)',marginTop:'8px'}}><span>VAT Base (TRAIN Law)</span><span>{formatPHP(result.breakdown.vatBase)}</span></div>
            <div className="result-row" style={{paddingBottom:'12px',borderBottom:'2px solid var(--border)'}}>
              <span>VAT (12%)</span><span>{result.isDeMinimis?'EXEMPT':formatPHP(result.breakdown.vat)}</span>
            </div>

            <div className="result-row total" style={{marginTop:'10px',paddingTop:'12px',borderTop:'2px solid var(--accent)',fontSize:'16px'}}>
              <span>TOTAL ASSESSMENT PAYABLE</span><span>{formatPHP(result.breakdown.grandTotal)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
