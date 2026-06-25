import { useState, useEffect, useCallback } from 'react'
import { assessmentApi } from '../lib/assessmentApi'
import { generateAssessmentPDF } from '../utils/pdfGenerator'

const fmt = n => (n||0).toLocaleString('en-PH',{minimumFractionDigits:2})

const SC = {
  draft:        {bg:'#f1f5f9',color:'#475569'},
  submitted:    {bg:'#dbeafe',color:'#1e40af'},
  under_review: {bg:'#fef3c7',color:'#b45309'},
  approved:     {bg:'#dcfce7',color:'#15803d'},
  rejected:     {bg:'#fee2e2',color:'#dc2626'},
  cancelled:    {bg:'#f1f5f9',color:'#94a3b8'},
}
const SL = {draft:'Draft',submitted:'Submitted',under_review:'Under Review',approved:'Approved',rejected:'Rejected',cancelled:'Cancelled'}

function Badge({status}) {
  const s = SC[status] || SC.draft
  return <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,background:s.bg,color:s.color,whiteSpace:'nowrap'}}>{SL[status]||status}</span>
}

export default function AssessmentDashboard({ onOpen }) {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('')
  const [err,     setErr]     = useState(null)
  const [sel,     setSel]     = useState(null)
  const [wfLoad,  setWfLoad]  = useState(false)
  const [note,    setNote]    = useState('')
  const [pdfLoad, setPdfLoad] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const res = await assessmentApi.list({status:filter||undefined, limit:200})
      setData(res.data||[])
    } catch(e) { setErr(e.message) }
    setLoading(false)
  },[filter])
  useEffect(()=>{ load() },[load])

  const total   = data.length
  const pending = data.filter(d=>d.status==='submitted').length
  const review  = data.filter(d=>d.status==='under_review').length
  const approved= data.filter(d=>d.status==='approved').length
  const totPay  = data.reduce((s,d)=>s+(d.total_payable||0),0)
  const appPay  = data.filter(d=>d.status==='approved').reduce((s,d)=>s+(d.total_payable||0),0)

  async function doWorkflow(action, id) {
    if (action==='reject'&&!note.trim()){alert('Rejection reason required.');return}
    setWfLoad(true)
    try { await assessmentApi.workflow(id,{action,notes:note||undefined}); setNote(''); setSel(null); load() }
    catch(e){alert(e.message)}
    setWfLoad(false)
  }

  async function downloadPDF(row) {
    setPdfLoad(row.id)
    try {
      const full = await assessmentApi.get(row.id)
      generateAssessmentPDF(full)
    } catch(e){alert(e.message)}
    setPdfLoad(null)
  }

  return (
    <>
      <div className="stats" style={{marginBottom:'18px'}}>
        {[
          ['Total',         total,              undefined       ],
          ['Pending Review',pending,            '#1e40af'       ],
          ['Under Review',  review,             '#b45309'       ],
          ['Approved',      approved,           '#15803d'       ],
          ['Total Payable', `₱${fmt(totPay)}`, undefined       ],
          ['Approved PHP',  `₱${fmt(appPay)}`, '#15803d'       ],
        ].map(([l,v,c])=>(
          <div key={l} className="stat">
            <div className="stat-l">{l}</div>
            <div className="stat-v" style={{fontSize:'15px',color:c||'var(--text)'}}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginBottom:'12px'}}>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
          <select className="input" style={{maxWidth:'190px'}} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {Object.entries(SL).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}>↻ Refresh</button>
          {err&&<span style={{fontSize:'12px',color:'var(--danger)'}}>{err}</span>}
        </div>
      </div>

      {sel&&(
        <div className="card" style={{marginBottom:'12px',borderColor:'var(--accent)'}}>
          <div className="card-h">
            <span className="card-t">Workflow — <span className="code">{sel.acn}</span></span>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setSel(null);setNote('')}}>✕</button>
          </div>
          <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'10px',flexWrap:'wrap'}}>
            <Badge status={sel.status}/>
            <span style={{fontSize:'12px',color:'var(--text2)'}}>v{sel.version} | {sel.importer||'—'}</span>
          </div>
          <div className="fg">
            <label className="fl">Notes / Rejection Reason</label>
            <textarea className="input" rows={2} value={note} onChange={e=>setNote(e.target.value)}
              placeholder="Required for reject; optional for approve" style={{resize:'vertical'}}/>
          </div>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            {sel.status==='submitted'&&<button className="btn btn-primary btn-sm" disabled={wfLoad} onClick={()=>doWorkflow('check',sel.id)}>✓ Mark Under Review</button>}
            {sel.status==='under_review'&&<>
              <button className="btn btn-sm" disabled={wfLoad} style={{background:'var(--success)',color:'#fff',border:'none',padding:'4px 12px',borderRadius:'4px',cursor:'pointer',fontFamily:'inherit',fontWeight:600}} onClick={()=>doWorkflow('approve',sel.id)}>✓ Approve</button>
              <button className="btn btn-danger btn-sm" disabled={wfLoad} onClick={()=>doWorkflow('reject',sel.id)}>✗ Reject</button>
            </>}
            {['draft','submitted','under_review'].includes(sel.status)&&<button className="btn btn-ghost btn-sm" disabled={wfLoad} onClick={()=>doWorkflow('cancel',sel.id)}>⊘ Cancel</button>}
          </div>
        </div>
      )}
      {loading?(
        <div className="loading"><div className="spin"/></div>
      ):data.length===0?(
        <div className="empty">No assessments found. Create one in the Assessment Builder.</div>
      ):(
        <div className="card">
          <div className="card-h"><span className="card-t">{total} assessment{total!==1?'s':''}</span></div>
          <div className="tw">
            <table>
              <thead><tr>
                <th>ACN</th><th>Status</th><th>v</th><th>AHTN</th><th>Importer</th>
                <th style={{textAlign:'right'}}>DV (PHP)</th>
                <th style={{textAlign:'right'}}>Duty</th>
                <th style={{textAlign:'right'}}>VAT</th>
                <th style={{textAlign:'right'}}>Total</th>
                <th>Prepared By</th><th>Updated</th><th></th>
              </tr></thead>
              <tbody>
                {data.map(row=>(
                  <tr key={row.id} style={sel?.id===row.id?{background:'var(--accent-bg)'}:{}}>
                    <td><span className="code" style={{fontSize:'11px'}}>{row.acn}</span></td>
                    <td><Badge status={row.status}/></td>
                    <td style={{fontSize:'11px',color:'var(--text3)'}}>{row.version}</td>
                    <td><span className="code" style={{fontSize:'11px'}}>{row.ahtn_code||'—'}</span></td>
                    <td style={{maxWidth:'110px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:'12px'}}>{row.importer||'—'}</td>
                    <td style={{textAlign:'right',fontSize:'12px'}}>₱{fmt(row.dv_pesos)}</td>
                    <td style={{textAlign:'right',fontSize:'12px'}}>₱{fmt(row.customs_duty)}</td>
                    <td style={{textAlign:'right',fontSize:'12px'}}>₱{fmt(row.vat_php)}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'var(--accent)',fontSize:'12px'}}>₱{fmt(row.total_payable)}</td>
                    <td style={{fontSize:'11px'}}>{row.prepared_by_name||'—'}</td>
                    <td style={{fontSize:'11px',whiteSpace:'nowrap'}}>{row.updated_at?new Date(row.updated_at).toLocaleDateString('en-PH'):'—'}</td>
                    <td>
                      <div style={{display:'flex',gap:'4px'}}>
                        <button className="btn btn-ghost btn-sm" title="Workflow"
                          onClick={()=>setSel(sel?.id===row.id?null:row)}>
                          {sel?.id===row.id?'✕':'⚡'}
                        </button>
                        <button className="btn btn-ghost btn-sm" title="Download PDF"
                          disabled={pdfLoad===row.id}
                          onClick={()=>downloadPDF(row)}>
                          {pdfLoad===row.id?'…':'📄'}
                        </button>
                        {onOpen&&<button className="btn btn-primary btn-sm" onClick={()=>onOpen(row)}>Open</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
