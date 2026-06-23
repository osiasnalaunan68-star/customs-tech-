import { useState, useEffect } from 'react'
import { api } from '../lib/api'
export default function Settings() {
  const [form, setForm] = useState({ default_exchange_rate:56.0, vat_rate:12.0, professional_fee:0.0, theme:'dark' })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')
  useEffect(()=>{ api.get('/settings').then(d=>{ if(d&&!d.detail) setForm(d) }).catch(()=>{}).finally(()=>setLoading(false)) },[])
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  async function save() {
    setSaved(false); setErr('')
    try { await api.put('/settings', form); setSaved(true); setTimeout(()=>setSaved(false),3000) }
    catch(e) { setErr(e.message) }
  }
  if (loading) return <div className="loading"><div className="spin"/></div>
  return (
    <div className="card" style={{maxWidth:'480px'}}>
      <div className="card-h"><span className="card-t">User Settings</span></div>
      {err&&<div className="err">{err}</div>}
      {saved&&<div className="ok">✓ Settings saved successfully!</div>}
      <div className="fg"><label className="fl">Default Exchange Rate (₱/USD)</label>
        <input className="input" type="number" value={form.default_exchange_rate} onChange={e=>set('default_exchange_rate',parseFloat(e.target.value))}/></div>
      <div className="fg"><label className="fl">VAT Rate (%)</label>
        <input className="input" type="number" value={form.vat_rate} onChange={e=>set('vat_rate',parseFloat(e.target.value))}/></div>
      <div className="fg"><label className="fl">Professional Fee (PHP)</label>
        <input className="input" type="number" value={form.professional_fee} onChange={e=>set('professional_fee',parseFloat(e.target.value))}/></div>
      <div className="fg"><label className="fl">UI Theme</label>
        <select className="input" value={form.theme} onChange={e=>set('theme',e.target.value)}>
          <option value="dark">Dark</option><option value="light">Light</option>
        </select>
      </div>
      <button className="btn btn-primary" onClick={save}>Save Settings</button>
    </div>
  )
}
