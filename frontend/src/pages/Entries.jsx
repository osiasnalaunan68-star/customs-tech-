import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const fmt = v => (v||0).toLocaleString('en-PH', {minimumFractionDigits:2})
const pf  = (s, d=0) => parseFloat(s) || d

function computeIPF(cif) {
  if (cif <= 250000)  return 250
  if (cif <= 500000)  return 500
  if (cif <= 1000000) return 1000
  return 1500
}

const EMPTY = {
  shipment_id:'', client_id:'', entry_no:'', ahtn_code:'',
  description:'', quota_type:'', fob_value:'', freight:'0',
  insurance:'0', exchange_rate:'56', duty_rate:'', vat_rate:'12',
  aep:'1500', brokerage:'0', notes_text:'',
  cif_value:'0', customs_duty:'0', vat_base:'0',
  vat:'0', ipf:250, grand_total:'0'
}

function calcAll(f) {
  const cif_usd  = pf(f.fob_value) + pf(f.freight) + pf(f.insurance)
  const cif_php  = cif_usd * pf(f.exchange_rate, 56)
  const duty     = cif_php  * (pf(f.duty_rate) / 100)
  const vat_base = cif_php  + duty
  const vat      = vat_base * (pf(f.vat_rate, 12) / 100)
  const ipf      = computeIPF(cif_php)
  const grand    = duty + vat + ipf + pf(f.aep) + pf(f.brokerage)
  return {
    cif_value:    cif_php.toFixed(4),
    customs_duty: duty.toFixed(4),
    vat_base:     vat_base.toFixed(4),
    vat:          vat.toFixed(4),
    ipf,
    grand_total:  grand.toFixed(4),
  }
}

function toForm(e) {
  let aep = 1500, brokerage = 0, notes_text = ''
  try {
    const p = JSON.parse(e.notes || '{}')
    aep = p.aep ?? 1500; brokerage = p.brokerage ?? 0; notes_text = p.notes_text || ''
  } catch { notes_text = e.notes || '' }
  const base = {
    ...e,
    aep: String(aep), brokerage: String(brokerage), notes_text,
    fob_value:     String(e.fob_value     || ''),
    freight:       String(e.freight       || '0'),
    insurance:     String(e.insurance     || '0'),
    exchange_rate: String(e.exchange_rate || '56'),
    duty_rate:     String(e.duty_rate     || ''),
    vat_rate:      String(e.vat_rate      || '12'),
  }
  return { ...base, ...calcAll(base) }
}

const CALC = ['fob_value','freight','insurance','exchange_rate','duty_rate','vat_rate','aep','brokerage']
const SEC  = {fontSize:'11px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.07em',margin:'4px 0 8px'}

function printEntry(e) {
  const fob=pf(e.fob_value), fr=pf(e.freight), ins=pf(e.insurance)
  const exr=pf(e.exchange_rate,56), dr=pf(e.duty_rate), vr=pf(e.vat_rate,12)
  const cif_usd=fob+fr+ins, cif_php=cif_usd*exr
  const duty=cif_php*(dr/100), vat_base=cif_php+duty, vat=vat_base*(vr/100)
  const ipf=computeIPF(cif_php)
  let aep=1500, brokerage=0
  try { const p=JSON.parse(e.notes||'{}'); aep=p.aep??1500; brokerage=p.brokerage??0 } catch{}
  const grand=duty+vat+ipf+aep+brokerage
  const today=new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})
  const f2=v=>(v||0).toLocaleString('en-PH',{minimumFractionDigits:2})
  const cl=e.clients?.name||'—', sr=e.shipments?.reference_no||'—'
  const bracket=cif_php<=250000?'≤ ₱250,000':cif_php<=500000?'₱250k–₱500k':cif_php<=1000000?'₱500k–₱1M':'> ₱1,000,000'
  const win=window.open('','_blank','width=870,height=1150')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>BOC Worksheet — ${e.entry_no||'Draft'}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:11pt;color:#000;background:#fff;padding:16mm 20mm}
.hdr{text-align:center;padding-bottom:12px;border-bottom:3px double #000;margin-bottom:14px}
.boc{font-size:15pt;font-weight:bold;letter-spacing:2px}
.sub{font-size:9pt;color:#444;margin:2px 0}
.dtitle{font-size:12pt;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-top:8px}
.meta{display:flex;justify-content:space-between;font-size:10pt;margin-bottom:14px;padding:6px 10px;background:#f5f5f5;border:1px solid #ddd}
.sec{margin-bottom:12px}
.sttl{font-size:9pt;font-weight:bold;text-transform:uppercase;background:#e8e8e8;padding:4px 10px;border-left:4px solid #000;margin-bottom:8px;letter-spacing:.4px}
.ig{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;padding:2px 8px 8px;font-size:10pt}
.ir{display:flex;gap:8px;align-items:baseline}
.lb{color:#555;min-width:130px;font-size:9pt;white-space:nowrap}
.vl{font-weight:bold;border-bottom:1px solid #bbb;flex:1;padding-bottom:1px}
.ct{width:100%;border-collapse:collapse;font-size:10pt}
.ct td{padding:5px 10px;border:1px solid #ccc}
.rv{text-align:right;font-weight:bold;width:145px}
.sh td{background:#efefef;font-weight:bold;font-size:8.5pt;text-transform:uppercase;color:#444}
.tt td{background:#111;color:#fff;font-weight:bold;font-size:12pt}
.tt .rv{color:#fff}
.sigs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;margin-top:28px}
.sb{text-align:center}
.sl{border-top:1px solid #000;padding-top:6px;font-size:10pt;font-weight:bold;margin-top:36px}
.ss{font-size:8.5pt;color:#555;margin-top:3px}
.ft{text-align:center;margin-top:20px;font-size:8pt;color:#888;border-top:1px solid #ccc;padding-top:8px}
@media print{body{padding:0}@page{size:A4;margin:14mm 18mm}}
</style></head><body>
<div class="hdr">
  <div class="boc">⚓ BUREAU OF CUSTOMS</div>
  <div class="sub">Republic of the Philippines • Department of Finance</div>
  <div class="dtitle">Import Entry Assessment Worksheet</div>
  <div class="sub" style="margin-top:4px;font-size:8pt">Customs Tech by Osias.org — Digital Computation Tool</div>
</div>
<div class="meta">
  <span><strong>Entry No.:</strong> ${e.entry_no||'_______________'}</span>
  <span><strong>Date Generated:</strong> ${today}</span>
  <span><strong>AHTN 2022 / Year 2026</strong></span>
</div>
<div class="sec"><div class="sttl">I. Importer / Consignee</div>
<div class="ig">
  <div class="ir"><span class="lb">Client / Importer:</span><span class="vl">${cl}</span></div>
  <div class="ir"><span class="lb">Shipment Reference:</span><span class="vl">${sr}</span></div>
</div></div>
<div class="sec"><div class="sttl">II. Commodity Details</div>
<div class="ig">
  <div class="ir"><span class="lb">AHTN Code (2022):</span><span class="vl">${e.ahtn_code||'—'}</span></div>
  <div class="ir"><span class="lb">Quota Type:</span><span class="vl">${e.quota_type?e.quota_type.replace('_',' ').toUpperCase():'N/A'}</span></div>
  <div class="ir" style="grid-column:1/-1"><span class="lb">Description of Goods:</span><span class="vl">${e.description||'—'}</span></div>
</div></div>
<div class="sec"><div class="sttl">III. Dutiable Value — CIF Basis (CMTA Sec. 700)</div>
<table class="ct">
  <tr><td>FOB Value (Invoice Price)</td><td class="rv">USD ${f2(fob)}</td></tr>
  <tr><td>+ Freight Charges</td><td class="rv">USD ${f2(fr)}</td></tr>
  <tr><td>+ Insurance Premium</td><td class="rv">USD ${f2(ins)}</td></tr>
  <tr><td style="font-weight:bold">= CIF Value (USD)</td><td class="rv">USD ${f2(cif_usd)}</td></tr>
  <tr><td>× BSP Reference Exchange Rate</td><td class="rv">₱${f2(exr)}/USD</td></tr>
  <tr style="background:#f5f5f5"><td style="font-weight:bold">DUTIABLE VALUE — CIF (Philippine Peso)</td><td class="rv" style="font-size:12pt">₱${f2(cif_php)}</td></tr>
</table></div>
<div class="sec"><div class="sttl">IV. Tax Computation (RA 10863 / TRAIN Law)</div>
<table class="ct">
  <tr class="sh"><td colspan="2">A. Customs Duty</td></tr>
  <tr><td>CIF (PHP) × ${dr}% Tariff Rate (AHTN 2022)</td><td class="rv">₱${f2(duty)}</td></tr>
  <tr class="sh"><td colspan="2">B. Value-Added Tax — TRAIN Law (RA 10963)</td></tr>
  <tr><td>VAT Base = CIF (PHP) + Customs Duty</td><td class="rv">₱${f2(vat_base)}</td></tr>
  <tr><td>VAT = VAT Base × ${vr}%</td><td class="rv">₱${f2(vat)}</td></tr>
</table></div>
<div class="sec"><div class="sttl">V. BOC Processing Fees & Broker Charges</div>
<table class="ct">
  <tr><td>IPF — Import Processing Fee (CMO 26-2002)<br><small style="color:#777">CIF Bracket: ${bracket}</small></td><td class="rv">₱${f2(ipf)}</td></tr>
  <tr><td>AEP — Arrastre + Examination + Wharfage</td><td class="rv">₱${f2(aep)}</td></tr>
  ${brokerage>0?`<tr><td>Professional Brokerage Fee</td><td class="rv">₱${f2(brokerage)}</td></tr>`:''}
</table></div>
<table class="ct" style="margin-top:10px">
  <tr class="tt"><td>TOTAL TAXES AND CHARGES PAYABLE (PHP)</td><td class="rv">₱${f2(grand)}</td></tr>
</table>
<div class="sigs">
  <div class="sb"><div class="sl">Customs Broker / Declarant</div><div class="ss">PRC Lic. No.: ___________</div><div class="ss">Date: ___________</div></div>
  <div class="sb"><div class="sl">BOC Appraiser / Examiner</div><div class="ss">Section: ___________</div><div class="ss">Date: ___________</div></div>
  <div class="sb"><div class="sl">District Collector</div><div class="ss">Port of: ___________</div><div class="ss">Date: ___________</div></div>
</div>
<div class="ft"><strong>Customs Tech by Osias.org</strong> — Generated: ${today}<br>Computational worksheet only. All assessments subject to official BOC review and verification.</div>
</body></html>`)
  win.document.close(); win.focus(); setTimeout(()=>win.print(),400)
}

export default function Entries() {
  const [data, setData]           = useState([])
  const [clients, setClients]     = useState([])
  const [shipments, setShipments] = useState([])
  const [form, setForm]           = useState(EMPTY)
  const [edit, setEdit]           = useState(null)
  const [show, setShow]           = useState(false)
  const [loading, setLoading]     = useState(true)
  const [err, setErr]             = useState('')

  const load = async () => {
    const [e,c,s] = await Promise.all([
      api.get('/entries').catch(()=>[]),
      api.get('/clients').catch(()=>[]),
      api.get('/shipments').catch(()=>[]),
    ])
    setData(e); setClients(c); setShipments(s); setLoading(false)
  }
  useEffect(()=>{ load() },[])

  function set(k, v) {
    setForm(f => {
      const nf = {...f, [k]:v}
      return CALC.includes(k) ? {...nf, ...calcAll(nf)} : nf
    })
  }
  function openNew()  { setForm(EMPTY);    setEdit(null);   setShow(true); setErr('') }
  function openEdit(e){ setForm(toForm(e)); setEdit(e.id); setShow(true); setErr('') }

  async function save() {
    setErr('')
    try {
      const body = {
        shipment_id: form.shipment_id||null, client_id: form.client_id||null,
        entry_no: form.entry_no, ahtn_code: form.ahtn_code,
        description: form.description, quota_type: form.quota_type||null,
        fob_value:     pf(form.fob_value),
        freight:       pf(form.freight),
        insurance:     pf(form.insurance),
        cif_value:     pf(form.cif_value),
        exchange_rate: pf(form.exchange_rate, 56),
        duty_rate:     pf(form.duty_rate),
        customs_duty:  pf(form.customs_duty),
        vat_rate:      pf(form.vat_rate, 12),
        vat:           pf(form.vat),
        total_payable: pf(form.grand_total),
        notes: JSON.stringify({
          aep: pf(form.aep), brokerage: pf(form.brokerage),
          notes_text: form.notes_text||''
        }),
      }
      edit ? await api.put(`/entries/${edit}`, body) : await api.post('/entries', body)
      setShow(false); load()
    } catch(e) { setErr(e.message||'Save failed') }
  }

  async function del(id) {
    if (!confirm('Delete this entry?')) return
    await api.del(`/entries/${id}`); load()
  }

  return (
    <>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'16px'}}>
        <span style={{color:'var(--text2)',fontSize:'13px',alignSelf:'center'}}>{data.length} entries</span>
        <button className="btn btn-primary" onClick={openNew}>+ New Entry</button>
      </div>

      {show && (
        <div className="card" style={{marginBottom:'16px',borderColor:'var(--accent)'}}>
          <div className="card-h">
            <span className="card-t">{edit?'Edit Entry':'New Entry Worksheet'}</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setShow(false)}>✕</button>
          </div>
          {err && <div className="err">{err}</div>}

          <div style={SEC}>Entry Information</div>
          <div className="frow frow2">
            <div className="fg"><label className="fl">Entry No.</label>
              <input className="input" value={form.entry_no||''} onChange={e=>set('entry_no',e.target.value)}/></div>
            <div className="fg"><label className="fl">AHTN Code</label>
              <input className="input" placeholder="e.g. 0101.21.00" value={form.ahtn_code||''} onChange={e=>set('ahtn_code',e.target.value)}/></div>
            <div className="fg"><label className="fl">Client</label>
              <select className="input" value={form.client_id||''} onChange={e=>set('client_id',e.target.value)}>
                <option value="">— Select Client —</option>
                {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div className="fg"><label className="fl">Shipment</label>
              <select className="input" value={form.shipment_id||''} onChange={e=>set('shipment_id',e.target.value)}>
                <option value="">— Select Shipment —</option>
                {shipments.map(s=><option key={s.id} value={s.id}>{s.reference_no}</option>)}
              </select></div>
          </div>
          <div className="fg"><label className="fl">Description of Goods</label>
            <input className="input" value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>

          <div style={SEC}>Dutiable Value — CIF Components</div>
          <div className="frow frow3">
            <div className="fg"><label className="fl">FOB (USD)</label>
              <input className="input" type="number" value={form.fob_value||''} onChange={e=>set('fob_value',e.target.value)}/></div>
            <div className="fg"><label className="fl">Freight (USD)</label>
              <input className="input" type="number" value={form.freight} onChange={e=>set('freight',e.target.value)}/></div>
            <div className="fg"><label className="fl">Insurance (USD)</label>
              <input className="input" type="number" value={form.insurance} onChange={e=>set('insurance',e.target.value)}/></div>
            <div className="fg"><label className="fl">Exchange Rate (₱/USD)</label>
              <input className="input" type="number" value={form.exchange_rate} onChange={e=>set('exchange_rate',e.target.value)}/></div>
            <div className="fg"><label className="fl">Duty Rate (%)</label>
              <input className="input" type="number" value={form.duty_rate||''} onChange={e=>set('duty_rate',e.target.value)}/></div>
            <div className="fg"><label className="fl">VAT Rate (%)</label>
              <input className="input" type="number" value={form.vat_rate} onChange={e=>set('vat_rate',e.target.value)}/></div>
          </div>

          <div style={SEC}>BOC Charges</div>
          <div className="frow frow3">
            <div className="fg"><label className="fl">AEP (₱)</label>
              <input className="input" type="number" value={form.aep} onChange={e=>set('aep',e.target.value)}/>
              <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}}>Default ₱1,500 — editable</div></div>
            <div className="fg"><label className="fl">Brokerage Fee (₱)</label>
              <input className="input" type="number" value={form.brokerage} onChange={e=>set('brokerage',e.target.value)}/></div>
            <div className="fg"><label className="fl">IPF — Auto (CMO 26-2002)</label>
              <div className="input" style={{background:'var(--surface2)',color:'var(--accent)',fontWeight:700,display:'flex',alignItems:'center'}}>
                ₱{fmt(form.ipf)}</div>
              <div style={{fontSize:'11px',color:'var(--text3)',marginTop:'3px'}}>Based on CIF PHP bracket</div></div>
          </div>

          <div className="result-box" style={{marginBottom:'14px'}}>
            <div className="result-row"><span>CIF Value (PHP)</span><span>₱{fmt(form.cif_value)}</span></div>
            <div className="result-row"><span>Customs Duty</span><span>₱{fmt(form.customs_duty)}</span></div>
            <div className="result-row"><span>VAT</span><span>₱{fmt(form.vat)}</span></div>
            <div className="result-row"><span>IPF</span><span>₱{fmt(form.ipf)}</span></div>
            <div className="result-row"><span>AEP + Brokerage</span><span>₱{fmt(pf(form.aep)+pf(form.brokerage))}</span></div>
            <div className="result-row total"><span>GRAND TOTAL PAYABLE</span><span>₱{fmt(form.grand_total)}</span></div>
          </div>
          <button className="btn btn-primary" onClick={save}>💾 Save Entry</button>
        </div>
      )}

      {loading ? <div className="loading"><div className="spin"/></div>
       : data.length===0
       ? <div className="empty">No entries yet. Click + New Entry to start.</div>
       : (
        <div className="card"><div className="tw"><table>
          <thead><tr>
            <th>Entry No.</th><th>HS Code</th><th>Client</th>
            <th style={{textAlign:'right'}}>CIF (PHP)</th>
            <th style={{textAlign:'right'}}>Duty</th>
            <th style={{textAlign:'right'}}>VAT</th>
            <th style={{textAlign:'right'}}>Grand Total</th>
            <th></th>
          </tr></thead>
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
                <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                  <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(e)}>Edit</button>
                  <button className="btn btn-primary btn-sm" title="Print BOC Worksheet" onClick={()=>printEntry(e)}>🖨️</button>
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
