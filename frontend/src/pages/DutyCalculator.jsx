import { useState, useEffect } from 'react'
import { api } from '../lib/api'
const fmt = n => (n||0).toLocaleString('en-PH',{minimumFractionDigits:2})
const EMPTY = { fob:'', freight:'0', insurance:'0', exchange_rate:'', duty_rate:'', vat_rate:'12' }
export default function DutyCalculator() {
  const [form, setForm] = useState(EMPTY)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [liveRate, setLiveRate] = useState(null)
  const [err, setErr] = useState('')
  useEffect(()=>{ api.get('/calculator/exchange-rate').then(d=>setLiveRate(d.rate)).catch(()=>{}) },[])
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  async function calculate() {
    setLoading(true); setErr('')
    try {
      const data = await api.post('/calculator/duty', {
        fob: parseFloat(form.fob)||0, freight: parseFloat(form.freight)||0,
        insurance: parseFloat(form.insurance)||0, duty_rate: parseFloat(form.duty_rate)||0,
        vat_rate: parseFloat(form.vat_rate)||12,
        exchange_rate: parseFloat(form.exchange_rate)||liveRate||56,
      })
      setResult(data)
    } catch(e) { setErr('Calculation failed. Check your inputs.') }
    setLoading(false)
  }
  return (
    <>
      <div className="card" style={{marginBottom:'16px'}}>
        <div className="card-h">
          <span className="card-t">Import Duty Calculator (CMTA)</span>
          {liveRate&&<span style={{fontSize:'12px',color:'var(--text3)'}}>Live: ₱{liveRate}/USD</span>}
        </div>
        {err&&<div className="err">{err}</div>}
        <div className="frow frow3">
          <div className="fg"><label className="fl">FOB Value (USD) *</label><input className="input" type="number" placeholder="0.00" value={form.fob} onChange={e=>set('fob',e.target.value)}/></div>
          <div className="fg"><label className="fl">Freight (USD)</label><input className="input" type="number" value={form.freight} onChange={e=>set('freight',e.target.value)}/></div>
          <div className="fg"><label className="fl">Insurance (USD)</label><input className="input" type="number" value={form.insurance} onChange={e=>set('insurance',e.target.value)}/></div>
          <div className="fg"><label className="fl">Exchange Rate (₱/USD)</label><input className="input" type="number" placeholder={liveRate||'56.00'} value={form.exchange_rate} onChange={e=>set('exchange_rate',e.target.value)}/></div>
          <div className="fg"><label className="fl">Duty Rate (%) *</label><input className="input" type="number" placeholder="0" value={form.duty_rate} onChange={e=>set('duty_rate',e.target.value)}/></div>
          <div className="fg"><label className="fl">VAT Rate (%)</label><input className="input" type="number" value={form.vat_rate} onChange={e=>set('vat_rate',e.target.value)}/></div>
        </div>
        <div style={{display:'flex',gap:'10px'}}>
          <button className="btn btn-primary" onClick={calculate} disabled={loading}>{loading?'Calculating...':'Calculate Duty'}</button>
          <button className="btn btn-ghost" onClick={()=>{setForm(EMPTY);setResult(null)}}>Reset</button>
        </div>
      </div>
      {result&&(
        <div className="card">
          <div className="card-h"><span className="card-t">Computation Breakdown</span></div>
          <div className="result-box">
            <div className="result-row"><span>FOB Value</span><span>USD {fmt(result.fob_usd)}</span></div>
            <div className="result-row"><span>+ Freight</span><span>USD {fmt(result.freight_usd)}</span></div>
            <div className="result-row"><span>+ Insurance</span><span>USD {fmt(result.insurance_usd)}</span></div>
            <div className="result-row" style={{fontWeight:600}}><span>CIF (USD)</span><span>USD {fmt(result.cif_usd)}</span></div>
            <div className="result-row"><span>× Exchange Rate</span><span>₱{result.exchange_rate}</span></div>
            <div className="result-row" style={{fontWeight:600}}><span>CIF (PHP)</span><span>₱{fmt(result.cif_php)}</span></div>
            <div className="result-row"><span>Customs Duty ({result.duty_rate_pct}%)</span><span>₱{fmt(result.customs_duty)}</span></div>
            <div className="result-row"><span>VAT Base (CIF + Duty)</span><span>₱{fmt(result.vat_base)}</span></div>
            <div className="result-row"><span>VAT ({result.vat_rate_pct}%)</span><span>₱{fmt(result.vat)}</span></div>
            <div className="result-row total"><span>TOTAL TAXES PAYABLE</span><span>₱{fmt(result.total_payable)}</span></div>
          </div>
        </div>
      )}
    </>
  )
}
