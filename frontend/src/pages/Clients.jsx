import { useState, useEffect } from 'react'
import { api } from '../lib/api'
const EMPTY = { name:'', company:'', tin:'', email:'', phone:'', address:'' }
export default function Clients() {
  const [data, setData] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [edit, setEdit] = useState(null)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const load = () => api.get('/clients').then(setData).catch(()=>{}).finally(()=>setLoading(false))
  useEffect(()=>{ load() },[])
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  function openNew() { setForm(EMPTY); setEdit(null); setShow(true); setErr('') }
  function openEdit(c) { setForm(c); setEdit(c.id); setShow(true); setErr('') }
  async function save() {
    if (!form.name.trim()) { setErr('Name is required'); return }
    setErr('')
    try {
      edit ? await api.put(`/clients/${edit}`, form) : await api.post('/clients', form)
      setShow(false); load()
    } catch(e) { setErr(e.message) }
  }
  async function del(id) { if (!confirm('Delete this client?')) return; await api.del(`/clients/${id}`); load() }
  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px'}}>
        <span style={{color:'var(--text2)',fontSize:'13px',alignSelf:'center'}}>{data.length} clients</span>
        <button className="btn btn-primary" onClick={openNew}>+ New Client</button>
      </div>
      {show&&(
        <div className="card" style={{marginBottom:'16px',borderColor:'var(--accent)'}}>
          <div className="card-h"><span className="card-t">{edit?'Edit Client':'New Client'}</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>✕</button></div>
          {err&&<div className="err">{err}</div>}
          <div className="frow frow2">
            <div className="fg"><label className="fl">Full Name *</label><input className="input" value={form.name} onChange={e=>set('name',e.target.value)}/></div>
            <div className="fg"><label className="fl">Company</label><input className="input" value={form.company||''} onChange={e=>set('company',e.target.value)}/></div>
            <div className="fg"><label className="fl">TIN</label><input className="input" value={form.tin||''} onChange={e=>set('tin',e.target.value)}/></div>
            <div className="fg"><label className="fl">Email</label><input className="input" type="email" value={form.email||''} onChange={e=>set('email',e.target.value)}/></div>
            <div className="fg"><label className="fl">Phone</label><input className="input" value={form.phone||''} onChange={e=>set('phone',e.target.value)}/></div>
            <div className="fg"><label className="fl">Address</label><input className="input" value={form.address||''} onChange={e=>set('address',e.target.value)}/></div>
          </div>
          <button className="btn btn-primary" onClick={save}>Save Client</button>
        </div>
      )}
      {loading?<div className="loading"><div className="spin"/></div>:data.length===0?<div className="empty">No clients yet.</div>:(
        <div className="card"><div className="tw"><table>
          <thead><tr><th>Name</th><th>Company</th><th>TIN</th><th>Email</th><th>Phone</th><th></th></tr></thead>
          <tbody>{data.map(c=>(
            <tr key={c.id}>
              <td style={{fontWeight:600}}>{c.name}</td><td>{c.company||'—'}</td>
              <td><span className="code">{c.tin||'—'}</span></td><td>{c.email||'—'}</td><td>{c.phone||'—'}</td>
              <td style={{display:'flex',gap:'6px'}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(c)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={()=>del(c.id)}>Del</button>
              </td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </>
  )
}
