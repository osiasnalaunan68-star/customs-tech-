import { useState, useEffect } from 'react'
import { api } from '../lib/api'
const fmt = n => (n||0).toLocaleString('en-PH',{minimumFractionDigits:2})
const EMPTY = { shipment_id:'',client_id:'',entry_no:'',ahtn_code:'',description:'',quota_type:'',fob_value:'',freight:'0',insurance:'0',cif_value:'0',exchange_rate:'56',duty_rate:'',customs_duty:'0',vat_rate:'12',vat:'0',total_payable:'0',notes:'' }
function calc(f) {
  const fob=parseFloat(f.fob_value)||0, fr=parseFloat(f.freight)||0, ins=parseFloat(f.insurance)||0
  const exr=parseFloat(f.exchange_rate)||56, dr=parseFloat(f.duty_rate)||0, vr=parseFloat(f.vat_rate)||12
  const cif=(fob+fr+ins)*exr, duty=cif*(dr/100), vat=(cif+duty)*(vr/100)
  return { cif_value:cif.toFixed(4), customs_duty:duty.toFixed(4), vat:vat.toFixed(4), total_payable:(duty+vat).toFixed(4) }
}
export default function Entries() {
  const [data, setData] = useState([])
  const [clients, setClients] = useState([])
  const [shipments, setShipments] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [edit, setEdit] = useState(null)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const load = async () => {
    const [e,c,s] = await Promise.all([api.get('/entries').catch(()=>[]),api.get('/clients').catch(()=>[]),api.get('/shipments').catch(()=>[])])
    setData(e); setClients(c); setShipments(s); setLoading(false)
  }
  useEffect(()=>{ load() },[])
  function set(k,v) {
    setForm(f=>{ const nf={...f,[k]:v}
      if(['fob_value','freight','insurance','exchange_rate','duty_rate','vat_rate'].includes(k)) return {...nf,...calc(nf)}
      return nf })
  }
  function openNew() { setForm(EMPTY); setEdit(null); setShow(true); setErr('') }
  function openEdit(e) { setForm(e); setEdit(e.id); setShow(true); setErr('') }
  async function save() {
    setErr('')
    try {
      const b = {...form,fob_value:parseFloat(form.fob_value)||0,freight:parseFloat(form.freight)||0,insurance:parseFloat(form.insurance)||0,cif_value:parseFloat(form.cif_value)||0,exchange_rate:parseFloat(form.exchange_rate)||56,duty_rate:parseFloat(form.duty_rate)||0,customs_duty:parseFloat(form.customs_duty)||0,vat_rate:parseFloat(form.vat_rate)||12,vat:parseFloat(form.vat)||0,total_payable:parseFloat(form.total_payable)||0}
      edit ? await api.put(`/entries/${edit}`,b) : await api.post('/entries',b)
      setShow(false); load()
    } catch(e) { setErr(e.message) }
  }
  async function del(id) { if(!confirm('Delete?')) return; await api.del(`/entries/${id}`); load() }
  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px'}}>
        <span style={{color:'var(--text2)',fontSize:'13px',alignSelf:'center'}}>{data.length} entries</span>
        <button className="btn btn-primary" onClick={openNew}>+ New Entry</button>
      </div>
      {show&&(
        <div className="card" style={{marginBottom:'16px',borderColor:'var(--accent)'}}>
          <div className="card-h"><span className="card-t">{edit?'Edit Entry':'New Entry Worksheet'}</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>✕</button></div>
          {err&&<div className="err">{err}</div>}
          <div className="frow frow2">
            <div className="fg"><label className="fl">Entry No.</label><input className="input" value={form.entry_no||''} onChange={e=>set('entry_no',e.target.value)}/></div>
            <div className="fg"><label className="fl">AHTN Code</label><input className="input" value={form.ahtn_code||''} onChange={e=>set('ahtn_code',e.target.value)} placeholder="e.g. 0101.21.00"/></div>
            <div className="fg"><label className="fl">Client</label>
              <select className="input" value={form.client_id||''} onChange={e=>set('client_id',e.target.value)}>
                <option value="">-- Select --</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Shipment</label>
              <select className="input" value={form.shipment_id||''} onChange={e=>set('shipment_id',e.target.value)}>
                <option value="">-- Select --</option>
                {shipments.map(s=><option key={s.id} value={s.id}>{s.reference_no}</option>)}
              </select>
            </div>
          </div>
          <div className="fg"><label className="fl">Description</label><input className="input" value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>
          <div style={{fontWeight:700,fontSize:'12px',color:'var(--text3)',textTransform:'uppercase',margin:'12px 0 8px'}}>Valuation</div>
          <div className="frow frow3">
            <div className="fg"><label className="fl">FOB (USD)</label><input className="input" type="number" value={form.fob_value||''} onChange={e=>set('fob_value',e.target.value)}/></div>
            <div className="fg"><label className="fl">Freight (USD)</label><input className="input" type="number" value={form.freight} onChange={e=>set('freight',e.target.value)}/></div>
            <div className="fg"><label className="fl">Insurance (USD)</label><input className="input" type="number" value={form.insurance} onChange={e=>set('insurance',e.target.value)}/></div>
            <div className="fg"><label className="fl">Exchange Rate (₱)</label><input className="input" type="number" value={form.exchange_rate} onChange={e=>set('exchange_rate',e.target.value)}/></div>
            <div className="fg"><label className="fl">Duty Rate (%)</label><input className="input" type="number" value={form.duty_rate||''} onChange={e=>set('duty_rate',e.target.value)}/></div>
            <div className="fg"><label className="fl">VAT Rate (%)</label><input className="input" type="number" value={form.vat_rate} onChange={e=>set('vat_rate',e.target.value)}/></div>
          </div>
          <div className="result-box" style={{marginBottom:'14px'}}>
            <div className="result-row"><span>CIF Value (PHP)</span><span>₱{fmt(form.cif_value)}</span></div>
            <div className="result-row"><span>Customs Duty</span><span>₱{fmt(form.customs_duty)}</span></div>
            <div className="result-row"><span>VAT</span><span>₱{fmt(form.vat)}</span></div>
            <div className="result-row total"><span>TOTAL PAYABLE</span><span>₱{fmt(form.total_payable)}</span></div>
          </div>
          <button className="btn btn-primary" onClick={save}>Save Entry</button>
        </div>
      )}
      {loading?<div className="loading"><div className="spin"/></div>:data.length===0?<div className="empty">No entries yet.</div>:(
        <div className="card"><div className="tw"><table>
          <thead><tr><th>Entry No.</th><th>HS Code</th><th>Client</th><th>CIF (PHP)</th><th>Duty</th><th>VAT</th><th>Total</th><th></th></tr></thead>
          <tbody>{data.map(e=>(
            <tr key={e.id}>
              <td><span className="code">{e.entry_no||'—'}</span></td>
              <td><span className="code">{e.ahtn_code||'—'}</span></td>
              <td>{e.clients?.name||'—'}</td>
              <td>₱{fmt(e.cif_value)}</td><td>₱{fmt(e.customs_duty)}</td><td>₱{fmt(e.vat)}</td>
              <td style={{fontWeight:700}}>₱{fmt(e.total_payable)}</td>
              <td style={{display:'flex',gap:'6px'}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(e)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>del(e.id)}>Del</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </>
  )
}
