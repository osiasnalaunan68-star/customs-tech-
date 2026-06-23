import { useState, useEffect } from 'react'
import { api } from '../lib/api'
const EMPTY = { reference_no:'', client_id:'', origin:'', destination:'', eta:'', etd:'' }
export default function Shipments() {
  const [data, setData] = useState([])
  const [clients, setClients] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [edit, setEdit] = useState(null)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const load = async () => {
    const [s,c] = await Promise.all([api.get('/shipments').catch(()=>[]), api.get('/clients').catch(()=>[])])
    setData(s); setClients(c); setLoading(false)
  }
  useEffect(()=>{ load() },[])
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  function openNew() { setForm(EMPTY); setEdit(null); setShow(true); setErr('') }
  function openEdit(s) { setForm(s); setEdit(s.id); setShow(true); setErr('') }
  async function save() {
    if (!form.reference_no.trim()) { setErr('Reference No. is required'); return }
    setErr('')
    try {
      edit ? await api.put(`/shipments/${edit}`, form) : await api.post('/shipments', form)
      setShow(false); load()
    } catch(e) { setErr(e.message) }
  }
  async function del(id) { if (!confirm('Delete?')) return; await api.del(`/shipments/${id}`); load() }
  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px'}}>
        <span style={{color:'var(--text2)',fontSize:'13px',alignSelf:'center'}}>{data.length} shipments</span>
        <button className="btn btn-primary" onClick={openNew}>+ New Shipment</button>
      </div>
      {show&&(
        <div className="card" style={{marginBottom:'16px',borderColor:'var(--accent)'}}>
          <div className="card-h"><span className="card-t">{edit?'Edit Shipment':'New Shipment'}</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>✕</button></div>
          {err&&<div className="err">{err}</div>}
          <div className="frow frow2">
            <div className="fg"><label className="fl">Reference No. *</label><input className="input" value={form.reference_no||''} onChange={e=>set('reference_no',e.target.value)}/></div>
            <div className="fg"><label className="fl">Client</label>
              <select className="input" value={form.client_id||''} onChange={e=>set('client_id',e.target.value)}>
                <option value="">-- Select Client --</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="fg"><label className="fl">Origin</label><input className="input" value={form.origin||''} onChange={e=>set('origin',e.target.value)} placeholder="e.g. China"/></div>
            <div className="fg"><label className="fl">Destination</label><input className="input" value={form.destination||''} onChange={e=>set('destination',e.target.value)} placeholder="e.g. Manila"/></div>
            <div className="fg"><label className="fl">ETD</label><input className="input" type="date" value={form.etd||''} onChange={e=>set('etd',e.target.value)}/></div>
            <div className="fg"><label className="fl">ETA</label><input className="input" type="date" value={form.eta||''} onChange={e=>set('eta',e.target.value)}/></div>
          </div>
          <button className="btn btn-primary" onClick={save}>Save Shipment</button>
        </div>
      )}
      {loading?<div className="loading"><div className="spin"/></div>:data.length===0?<div className="empty">No shipments yet.</div>:(
        <div className="card"><div className="tw"><table>
          <thead><tr><th>Ref No.</th><th>Client</th><th>Origin</th><th>Destination</th><th>ETA</th><th></th></tr></thead>
          <tbody>{data.map(s=>(
            <tr key={s.id}>
              <td><span className="code">{s.reference_no||'—'}</span></td>
              <td>{s.clients?.name||'—'}</td><td>{s.origin||'—'}</td>
              <td>{s.destination||'—'}</td><td>{s.eta||'—'}</td>
              <td style={{display:'flex',gap:'6px'}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(s)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>del(s.id)}>Del</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </>
  )
}
