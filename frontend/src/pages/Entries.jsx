import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { calculateAssessment } from '../lib/ValuationEngine'

const fmt = v => (v||0).toLocaleString('en-PH',{minimumFractionDigits:2})
const pf  = (s,d=0) => parseFloat(s)||d

const EMPTY = {
  shipment_id:'',client_id:'',entry_no:'',ahtn_code:'',description:'',quota_type:'',
  fob_value:'',freight:'0',insurance:'0',exchange_rate:'56',duty_rate:'',vat_rate:'12',
  aep:'1500',brokerage:'0',notes_text:'',cif_value:'0',customs_duty:'0',vat_base:'0',
  vat:'0',ipf:250,grand_total:'0'
}

// 🚀 GINAGAMIT NA NATIN ANG ENGINE DITO KAHIT SA TYPING PA LANG
function calcAll(f) {
  try {
    const res = calculateAssessment({
      fob:          f.fob_value,
      freight:      f.freight,
      insurance:    f.insurance,
      exchangeRate: f.exchange_rate,
      tariffRate:   f.duty_rate,
      aep:          f.aep,
      brokerageFee: f.brokerage,
      isExcise:     false // Simplified for entry list view
    })
    const b = res.breakdown
    return {
      cif_value:    String(b.cifPhpRaw),
      customs_duty: String(b.duty),
      vat_base:     String(b.vatBase),
      vat:          String(b.vat),
      ipf:          b.ipf,
      grand_total:  String(b.grandTotal)
    }
  } catch (e) {
    // Kung kulang pa tinatype ng user (ex. blank FOB), wag i-crash. Return 0.
    return { cif_value:'0', customs_duty:'0', vat_base:'0', vat:'0', ipf:250, grand_total:'0' }
  }
}

function toForm(e) {
  let aep=1500,brokerage=0,notes_text=''
  try { const p=JSON.parse(e.notes||'{}'); aep=p.aep??1500; brokerage=p.brokerage??0; notes_text=p.notes_text||'' } catch{ notes_text=e.notes||'' }
  const base={...e,aep:String(aep),brokerage:String(brokerage),notes_text,fob_value:String(e.fob_value||''),freight:String(e.freight||'0'),insurance:String(e.insurance||'0'),exchange_rate:String(e.exchange_rate||'56'),duty_rate:String(e.duty_rate||''),vat_rate:String(e.vat_rate||'12')}
  return {...base,...calcAll(base)}
}

function toAssessment(e) {
  return {
    entry_no:      e.entry_no      || '',
    client_name:   e.clients?.name || '',
    description:   e.description   || '',
    ahtn_code:     e.ahtn_code     || '',
    fob_value:     e.fob_value     || 0,
    freight:       e.freight       || 0,
    insurance:     e.insurance     || 0,
    exchange_rate: e.exchange_rate || 56,
    duty_rate:     e.duty_rate     || 0,
    incoterms:    'CIF',
    aep:           1500,
    brokerage:     0,
  }
}

const CALC=['fob_value','freight','insurance','exchange_rate','duty_rate','aep','brokerage']
const SEC={fontSize:'11px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',margin:'4px 0 8px'}

export default function Entries({ setSharedData=()=>{}, setPage=()=>{} }) {
  const [data, setData]          = useState([])
  const [clients,setClients]     = useState([])
  const [shipments,setShipments] = useState([])
  const [form,setForm]           = useState(EMPTY)
  const [edit,setEdit]           = useState(null)
  const [show,setShow]           = useState(false)
  const [loading,setLoading]     = useState(true)
  const [err,setErr]             = useState('')

  const load = async () => {
    const [e,c,s] = await Promise.all([api.get('/entries').catch(()=>[]),api.get('/clients').catch(()=>[]),api.get('/shipments').catch(()=>[])])
    setData(e); setClients(c); setShipments(s); setLoading(false)
  }
  useEffect(()=>{ load() },[])

  function setD(k,v){ setForm(f=>{ const nf={...f,[k]:v}; return CALC.includes(k)?{...nf,...calcAll(nf)}:nf }) }
  function openNew(){ setForm(EMPTY); setEdit(null); setShow(true); setErr('') }
  function openEdit(e){ setForm(toForm(e)); setEdit(e.id); setShow(true); setErr('') }
  function reviewEntry(e){ setSharedData(toAssessment(e)); setPage('assessment') }

  async function save() {
    setErr('')
    try {
      const body={shipment_id:form.shipment_id||null,client_id:form.client_id||null,entry_no:form.entry_no,ahtn_code:form.ahtn_code,description:form.description,quota_type:form.quota_type||null,fob_value:pf(form.fob_value),freight:pf(form.freight),insurance:pf(form.insurance),cif_value:pf(form.cif_value),exchange_rate:pf(form.exchange_rate,56),duty_rate:pf(form.duty_rate),customs_duty:pf(form.customs_duty),vat_rate:12,vat:pf(form.vat),total_payable:pf(form.grand_total),notes:JSON.stringify({aep:pf(form.aep),brokerage:pf(form.brokerage),notes_text:form.notes_text||''})}
      edit ? await api.put(`/entries/${edit}`,body) : await api.post('/entries',body)
      setShow(false); load()
    } catch(e){ setErr(e.message||'Save failed') }
  }
  async function del(id){ if(!confirm('Delete this entry?')) return; await api.del(`/entries/${id}`); load() }

  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px'}}>
        <span style={{color:'var(--text2)',fontSize:'13px',alignSelf:'center'}}>{Array.isArray(data)?data.length:0} entries</span>
        <button className="btn btn-primary" onClick={openNew}>+ New Entry</button>
      </div>
      {show&&(
        <div className="card" style={{marginBottom:'16px',borderColor:'var(--accent)'}}>
          <div className="card-h"><span className="card-t">{edit?'Edit Entry':'New Entry Worksheet'}</span><button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>✕</button></div>
          {err&&<div className="err">{err}</div>}
          <div style={SEC}>Entry Information</div>
          <div className="frow frow2">
            <div className="fg"><label className="fl">Entry No.</label><input className="input" value={form.entry_no||''} onChange={e=>setD('entry_no',e.target.value)}/></div>
            <div className="fg"><label className="fl">AHTN Code</label><input className="input" placeholder="e.g. 0101.21.00" value={form.ahtn_code||''} onChange={e=>setD('ahtn_code',e.target.value)}/></div>
            <div className="fg"><label className="fl">Client</label><select className="input" value={form.client_id||''} onChange={e=>setD('client_id',e.target.value)}><option value="">— Select —</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div className="fg"><label className="fl">Shipment</label><select className="input" value={form.shipment_id||''} onChange={e=>setD('shipment_id',e.target.value)}><option value="">— Select —</option>{shipments.map(s=><option key={s.id} value={s.id}>{s.reference_no}</option>)}</select></div>
          </div>
          <div className="fg"><label className="fl">Description</label><input className="input" value={form.description||''} onChange={e=>setD('description',e.target.value)}/></div>
          <div style={SEC}>Dutiable Value</div>
          <div className="frow frow3">
            <div className="fg"><label className="fl">FOB (USD)</label><input className="input" type="number" value={form.fob_value||''} onChange={e=>setD('fob_value',e.target.value)}/></div>
            <div className="fg"><label className="fl">Freight (USD)</label><input className="input" type="number" value={form.freight} onChange={e=>setD('freight',e.target.value)}/></div>
            <div className="fg"><label className="fl">Insurance (USD)</label><input className="input" type="number" value={form.insurance} onChange={e=>setD('insurance',e.target.value)}/></div>
            <div className="fg"><label className="fl">Exchange Rate (₱)</label><input className="input" type="number" value={form.exchange_rate} onChange={e=>setD('exchange_rate',e.target.value)}/></div>
            <div className="fg"><label className="fl">Duty Rate (%)</label><input className="input" type="number" value={form.duty_rate||''} onChange={e=>setD('duty_rate',e.target.value)}/></div>
            <div className="fg"><label className="fl">AEP (₱)</label><input className="input" type="number" value={form.aep} onChange={e=>setD('aep',e.target.value)}/></div>
          </div>
          <div className="result-box" style={{marginBottom:'14px'}}>
            <div className="result-row"><span>CIF (PHP Raw)</span><span>₱{fmt(form.cif_value)}</span></div>
            <div className="result-row"><span>Customs Duty</span><span>₱{fmt(form.customs_duty)}</span></div>
            <div className="result-row"><span>VAT</span><span>₱{fmt(form.vat)}</span></div>
            <div className="result-row total"><span>GRAND TOTAL</span><span>₱{fmt(form.grand_total)}</span></div>
          </div>
          <button className="btn btn-primary" onClick={save}>💾 Save Entry</button>
        </div>
      )}
      {loading?<div className="loading"><div className="spin"/></div>
       :!Array.isArray(data)||data.length===0?<div className="empty">No entries yet.</div>:(
        <div className="card"><div className="tw"><table>
          <thead><tr><th>Entry No.</th><th>HS Code</th><th>Client</th><th style={{textAlign:'right'}}>CIF (PHP)</th><th style={{textAlign:'right'}}>Duty</th><th style={{textAlign:'right'}}>VAT</th><th style={{textAlign:'right'}}>Total</th><th></th></tr></thead>
          <tbody>{data.map(e=>(
            <tr key={e.id}>
              <td><span className="code">{e.entry_no||'—'}</span></td>
              <td><span className="code">{e.ahtn_code||'—'}</span></td>
              <td>{e.clients?.name||'—'}</td>
              <td style={{textAlign:'right'}}>₱{fmt(e.cif_value)}</td>
              <td style={{textAlign:'right'}}>₱{fmt(e.customs_duty)}</td>
              <td style={{textAlign:'right'}}>₱{fmt(e.vat)}</td>
              <td style={{textAlign:'right',fontWeight:700,color:'var(--accent)'}}>₱{fmt(e.total_payable)}</td>
              <td>
                <div style={{display:'flex',gap:'4px'}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(e)}>Edit</button>
                  <button className="btn btn-primary btn-sm" title="Open in Assessment Builder" onClick={()=>reviewEntry(e)}>📋</button>
                  <button className="btn btn-danger btn-sm" onClick={()=>del(e.id)}>Del</button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </>
  )
}
