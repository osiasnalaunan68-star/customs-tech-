import { useState, useEffect, useRef } from 'react'

const N='#0d2a4e', AC='#1e40af', BD='#e2e8f0', SL='#475569'
const fmt = n => (n||0).toLocaleString('en-PH',{minimumFractionDigits:2})
const pf  = (s,d=0) => parseFloat(s)||d

function getIPF(dv) {
  if (dv<=250000) return 250; if (dv<=500000) return 500
  if (dv<=750000) return 750; return 1000
}
function doCalc(f) {
  const inco=f.incoterms||'CIF', base=pf(f.fob)
  const cu=inco==='CIF'?base:inco==='CFR'?base+pf(f.insurance):base+pf(f.freight)+pf(f.insurance)
  const cp=cu*pf(f.exchange_rate,56), rdv=Math.ceil(cp)
  const deMin=rdv<=10000
  const duty=deMin?0:rdv*(pf(f.duty_rate)/100)
  const ex=pf(f.excise_tax), ifee=getIPF(rdv), aep=pf(f.aep,1500)
  const brok=pf(f.brokerage), cds=15, dst=30
  const vb=rdv+duty+ex+ifee+aep+brok+cds+dst
  const vat=deMin?0:vb*0.12
  const tot=duty+ex+vat+ifee+aep+brok+cds+dst
  return {cu,cp,rdv,duty,ex,ifee,aep,brok,cds,dst,vb,vat,tot,deMin}
}
const INIT={
  bl_number:'',invoice_no:'',container_no:'',broker_tin:'',prc_no:'',
  incoterms:'CIF',importer:'',consignee:'',commodity:'',origin_country:'',
  port:'Manila',declarant_name:'',ahtn_code:'',
  fob:'',freight:'0',insurance:'0',exchange_rate:'56.00',
  duty_rate:'0',excise_tax:'0',aep:'1500',brokerage:'0',
}
const PCSS=`@media print{
.ed-col{display:none!important}
.pv-col{width:100%!important;max-width:none!important;flex:none!important}
.pv-paper{border:none!important;box-shadow:none!important;padding:0!important}
.sidebar,.topbar,.mnav{display:none!important}
.main{overflow:visible!important}
.page{padding:0!important;max-width:none!important}
@page{size:A4 portrait;margin:12mm 16mm}}`
const LB={fontSize:'10px',fontWeight:700,color:SL,textTransform:'uppercase',letterSpacing:'.05em'}
const SC={fontSize:'9px',fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:'8px',paddingBottom:'4px',borderBottom:'1px solid #f1f5f9'}
const CD={background:'#fff',border:'1px solid '+BD,borderRadius:'6px',padding:'12px',marginBottom:'10px'}
const FG={display:'flex',flexDirection:'column',gap:'3px',marginBottom:'8px'}
const G2={display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}
const inp=(d)=>({width:'100%',padding:'6px 8px',border:'1px solid '+(d?'#ebebeb':BD),borderRadius:'4px',fontFamily:'inherit',fontSize:'12px',outline:'none',background:d?'#f8fafc':'#fff',color:d?'#94a3b8':'#0f172a',boxSizing:'border-box'})
const PT={width:'100%',borderCollapse:'collapse',marginBottom:'12px'}
const PTH={padding:'4px 10px',fontWeight:800,fontSize:'8pt',textTransform:'uppercase',letterSpacing:'.3px',borderLeft:'3px solid #444',color:'#333',background:'#efefef'}
const PT1={padding:'5px 10px',border:'1px solid #ccc',fontSize:'9.5pt',color:'#555'}
const PT2={padding:'5px 10px',border:'1px solid #ccc',fontSize:'9.5pt',fontWeight:600}
const PTV={padding:'5px 10px',border:'1px solid #ccc',fontSize:'9.5pt',fontWeight:'bold',textAlign:'right',width:'160px'}

export default function AssessmentNoticePrintable({ sharedData }) {
  const [f,setF]           = useState(INIT)
  const [c,setC]           = useState(doCalc(INIT))
  const [logo1,setL1]      = useState(null)
  const [logo2,setL2]      = useState(null)
  const [company,setCo]    = useState('Assessment Document Builder')
  const [sub,setSub]       = useState('Professional Customs Brokerage Computation Tool')
  const [sigData,setSig]   = useState(null)
  const [lu,setLu]         = useState('')
  const [hsQuery,setHsQ]   = useState('')
  const [hsSugs,setHsSugs] = useState([])
  const [hsLoad,setHsLoad] = useState(false)
  const [showHs,setShowHs] = useState(false)
  const cvs=useRef(null), lp=useRef(null), drawing=useRef(false), hsTimer=useRef(null)

  useEffect(()=>setC(doCalc(f)),[f])

  useEffect(()=>{
    if (!sharedData) return
    const nd={
      ...INIT,
      bl_number:     sharedData.entry_no      || '',
      importer:      sharedData.client_name   || '',
      consignee:     sharedData.client_name   || '',
      commodity:     sharedData.description   || sharedData.commodity || '',
      ahtn_code:     sharedData.ahtn_code     || '',
      fob:           String(sharedData.fob_value     || sharedData.fob     || ''),
      freight:       String(sharedData.freight       || '0'),
      insurance:     String(sharedData.insurance     || '0'),
      exchange_rate: String(sharedData.exchange_rate || '56.00'),
      duty_rate:     String(sharedData.duty_rate     || '0'),
      aep:           String(sharedData.aep           || '1500'),
      brokerage:     String(sharedData.brokerage     || '0'),
      incoterms:     sharedData.incoterms            || 'CIF',
    }
    setF(nd)
    if (sharedData.ahtn_code)
      setHsQ(sharedData.ahtn_code+(sharedData.description?` — ${sharedData.description}`:''))
  },[sharedData])

  function readImg(e,setter){ const file=e.target.files[0]; if(!file) return; const r=new FileReader(); r.onload=ev=>setter(ev.target.result); r.readAsDataURL(file) }
  function getPos(e){ const el=cvs.current, rect=el.getBoundingClientRect(); return {x:(e.clientX-rect.left)*(el.width/rect.width),y:(e.clientY-rect.top)*(el.height/rect.height)} }
  function onPD(e){ e.preventDefault(); drawing.current=true; const p=getPos(e); lp.current=p; const ctx=cvs.current.getContext('2d'); ctx.beginPath(); ctx.arc(p.x,p.y,1.5,0,Math.PI*2); ctx.fillStyle=AC; ctx.fill() }
  function onPM(e){ if(!drawing.current) return; e.preventDefault(); const p=getPos(e),ctx=cvs.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(lp.current.x,lp.current.y); ctx.lineTo(p.x,p.y); ctx.strokeStyle=AC; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke(); lp.current=p }
  function onPU(){ if(!drawing.current) return; drawing.current=false; setSig(cvs.current.toDataURL()) }
  function clearSig(){ const ctx=cvs.current.getContext('2d'); ctx.clearRect(0,0,cvs.current.width,cvs.current.height); setSig(null) }
  function set(k,v){ setF(p=>({...p,[k]:v})); if(k==='exchange_rate') setLu(new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})) }

  async function searchHS(q){
    if(!q||q.length<2){ setHsSugs([]); setShowHs(false); return }
    setHsLoad(true)
    try {
      const BASE=import.meta.env.VITE_API_URL||'http://localhost:8000'
      const isCode=/^\d[\d.]*$/.test(q.trim())
      const param=isCode?`code_prefix=${encodeURIComponent(q.trim())}`:`q=${encodeURIComponent(q.trim())}`
      const res=await fetch(`${BASE}/api/tariff/codes?${param}&limit=8&year=2026`)
      const data=await res.json()
      setHsSugs(Array.isArray(data)?data:[])
      setShowHs(true)
    } catch{ setHsSugs([]) }
    setHsLoad(false)
  }
  function onHsInput(v){ setHsQ(v); clearTimeout(hsTimer.current); hsTimer.current=setTimeout(()=>searchHS(v),380) }
  function selectHs(item){ set('duty_rate',String(item.rate??0)); set('ahtn_code',item.ahtn_code||''); setHsQ(`${item.ahtn_code} — ${item.description}`); setShowHs(false) }

  const today=new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})
  const inco=f.incoterms||'CIF', dF=inco==='CIF'||inco==='CFR', dI=inco==='CIF'
  const FL=inco==='CIF'?'CIF (USD)':inco==='CFR'?'CFR (USD)':'FOB (USD)'
  const CIRC={width:'64px',height:'64px',borderRadius:'50%',objectFit:'cover',border:'2px solid '+BD,display:'block'}
  const CE={...CIRC,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:'9px',fontWeight:700}

  return (
    <div style={{fontFamily:'Inter,system-ui,sans-serif',color:'#0f172a'}}>
      <style>{PCSS}</style>
      <div style={{display:'flex',gap:'14px',alignItems:'flex-start',flexWrap:'wrap'}}>
        <div className="ed-col" style={{width:'330px',flexShrink:0,overflowY:'auto',maxHeight:'calc(100vh - 160px)'}}>
          {sharedData&&<div style={{padding:'6px 10px',background:'#dbeafe',border:'1px solid #93c5fd',borderRadius:'4px',fontSize:'11px',fontWeight:700,color:AC,marginBottom:'8px'}}>✓ Auto-populated from Entry Worksheet</div>}
          <div style={CD}>
            <div style={SC}>Custom Branding</div>
            <div style={G2}>
              <div style={FG}><label style={LB}>Logo Left</label><input type="file" accept="image/*" style={{fontSize:'11px'}} onChange={e=>readImg(e,setL1)}/>{logo1&&<img src={logo1} alt="" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',marginTop:'4px'}}/>}</div>
              <div style={FG}><label style={LB}>Logo Right</label><input type="file" accept="image/*" style={{fontSize:'11px'}} onChange={e=>readImg(e,setL2)}/>{logo2&&<img src={logo2} alt="" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',marginTop:'4px'}}/>}</div>
            </div>
            <div style={FG}><label style={LB}>Company Name</label><input style={inp(false)} value={company} onChange={e=>setCo(e.target.value)}/></div>
            <div style={FG}><label style={LB}>Sub-header</label><input style={inp(false)} value={sub} onChange={e=>setSub(e.target.value)}/></div>
          </div>
          <div style={CD}>
            <div style={SC}>Document Reference</div>
            <div style={G2}>
              <div style={FG}><label style={LB}>B/L or AWB No.</label><input style={inp(false)} value={f.bl_number} onChange={e=>set('bl_number',e.target.value)} placeholder="MAEU12345"/></div>
              <div style={FG}><label style={LB}>Invoice No.</label><input style={inp(false)} value={f.invoice_no} onChange={e=>set('invoice_no',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Container No.</label><input style={inp(false)} value={f.container_no} onChange={e=>set('container_no',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Incoterms</label>
                <select style={inp(false)} value={f.incoterms} onChange={e=>set('incoterms',e.target.value)}>
                  <option value="CIF">CIF — Cost, Insurance &amp; Freight</option>
                  <option value="CFR">CFR — Cost &amp; Freight</option>
                  <option value="FOB">FOB — Free on Board</option>
                </select>
              </div>
              <div style={FG}><label style={LB}>Broker TIN</label><input style={inp(false)} value={f.broker_tin} onChange={e=>set('broker_tin',e.target.value)}/></div>
              <div style={FG}><label style={LB}>PRC License No.</label><input style={inp(false)} value={f.prc_no} onChange={e=>set('prc_no',e.target.value)}/></div>
            </div>
          </div>
          <div style={CD}>
            <div style={SC}>Parties &amp; Commodity</div>
            <div style={FG}><label style={LB}>Importer of Record</label><input style={inp(false)} value={f.importer} onChange={e=>set('importer',e.target.value)}/></div>
            <div style={FG}><label style={LB}>Consignee</label><input style={inp(false)} value={f.consignee} onChange={e=>set('consignee',e.target.value)}/></div>
            <div style={FG}><label style={LB}>Commodity Description</label><input style={inp(false)} value={f.commodity} onChange={e=>set('commodity',e.target.value)}/></div>
            <div style={G2}>
              <div style={FG}><label style={LB}>Country of Origin</label><input style={inp(false)} value={f.origin_country} onChange={e=>set('origin_country',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Port of Entry</label><input style={inp(false)} value={f.port} onChange={e=>set('port',e.target.value)}/></div>
            </div>
          </div>
          <div style={CD}>
            <div style={SC}>HS Code Search + Valuation</div>
            <div style={{...FG,position:'relative'}}>
              <label style={LB}>HS Search (auto-fills duty rate)</label>
              <div style={{position:'relative'}}>
                <input style={inp(false)} value={hsQuery} onChange={e=>onHsInput(e.target.value)} onBlur={()=>setTimeout(()=>setShowHs(false),200)} placeholder="Type e.g. rice, motor, 8703, 0101"/>
                {hsLoad&&<span style={{position:'absolute',right:'8px',top:'7px',fontSize:'11px',color:'#94a3b8'}}>⟳</span>}
              </div>
              {showHs&&hsSugs.length>0&&(
                <div style={{position:'absolute',top:'100%',left:0,right:0,background:'#fff',border:'1px solid '+BD,borderRadius:'4px',zIndex:200,maxHeight:'180px',overflowY:'auto',boxShadow:'0 4px 12px rgba(0,0,0,.12)'}}>
                  {hsSugs.map(item=>(
                    <button key={item.id||item.ahtn_code} onClick={()=>selectHs(item)} style={{width:'100%',textAlign:'left',padding:'6px 10px',border:'none',borderBottom:'1px solid #f1f5f9',background:'none',cursor:'pointer',fontFamily:'inherit',fontSize:'11px',display:'flex',justifyContent:'space-between',gap:'6px',alignItems:'center'}}>
                      <span style={{fontFamily:'monospace',color:AC,fontWeight:700,flexShrink:0}}>{item.ahtn_code}</span>
                      <span style={{color:SL,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.description}</span>
                      <span style={{color:'#16a34a',fontWeight:700,flexShrink:0,marginLeft:'6px'}}>{item.rate??'—'}%</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={G2}>
              <div style={FG}><label style={LB}>{FL} *</label><input style={inp(false)} type="number" value={f.fob} onChange={e=>set('fob',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Freight (USD)</label><input style={inp(dF)} type="number" value={f.freight} onChange={e=>set('freight',e.target.value)} disabled={dF}/></div>
              <div style={FG}><label style={LB}>Insurance (USD)</label><input style={inp(dI)} type="number" value={f.insurance} onChange={e=>set('insurance',e.target.value)} disabled={dI}/></div>
              <div style={FG}><label style={LB}>Rate (₱/USD)</label>
                <input style={inp(false)} type="number" value={f.exchange_rate} onChange={e=>set('exchange_rate',e.target.value)}/>
                {lu&&<span style={{fontSize:'10px',color:'#22c55e',marginTop:'2px'}}>✓ Updated {lu}</span>}
              </div>
              <div style={FG}><label style={LB}>MFN Duty Rate (%)</label><input style={inp(false)} type="number" value={f.duty_rate} onChange={e=>set('duty_rate',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Excise Tax (₱)</label><input style={inp(false)} type="number" value={f.excise_tax} onChange={e=>set('excise_tax',e.target.value)}/></div>
              <div style={FG}><label style={LB}>AEP (₱)</label><input style={inp(false)} type="number" value={f.aep} onChange={e=>set('aep',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Brokerage Fee (₱)</label><input style={inp(false)} type="number" value={f.brokerage} onChange={e=>set('brokerage',e.target.value)}/></div>
            </div>
            <div style={{fontSize:'10px',color:'#94a3b8',marginTop:'2px'}}>CDS ₱15 + DST ₱30 — statutory fixed fees (auto-included)</div>
          </div>
          <div style={CD}>
            <div style={SC}>Digital Signature</div>
            <canvas ref={cvs} width={480} height={120} style={{width:'100%',height:'120px',border:'1px solid '+BD,borderRadius:'4px',background:'#fafcff',touchAction:'none',cursor:'crosshair',display:'block'}} onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'6px'}}>
              <button onClick={clearSig} style={{padding:'4px 12px',border:'1px solid '+BD,borderRadius:'4px',background:'#fff',color:SL,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>✕ Clear</button>
              {sigData&&<span style={{fontSize:'11px',color:'#22c55e',fontWeight:600}}>✓ Captured</span>}
            </div>
            <div style={{...FG,marginTop:'10px'}}><label style={LB}>Declarant / Broker Name</label><input style={inp(false)} value={f.declarant_name} onChange={e=>set('declarant_name',e.target.value)} placeholder="Full name of signatory"/></div>
          </div>
          <div style={{...CD,border:'2px solid '+N,background:'#eff6ff'}}>
            <div style={SC}>Live Assessment Summary</div>
            {c.deMin&&<div style={{padding:'6px 10px',background:'#fef9c3',border:'1px solid #fde047',borderRadius:'4px',fontSize:'11px',fontWeight:700,color:'#854d0e',marginBottom:'8px'}}>⚠ DE MINIMIS — Duty &amp; VAT exempt (CMTA Sec. 423)</div>}
            {[['Rounded DV',c.rdv],['Customs Duty',c.duty],['Excise Tax',c.ex],['VAT (12%)',c.vat],['IPF',c.ifee],['AEP',c.aep],['CDS (fixed)',c.cds],['DST (fixed)',c.dst],['Brokerage',c.brok]].map(([n,v],i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid '+BD,fontSize:'12px'}}>
                <span style={{color:SL}}>{n}</span><span style={{fontWeight:600}}>₱{fmt(v)}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px',padding:'8px 10px',background:N,borderRadius:'5px'}}>
              <span style={{color:'#93c5fd',fontWeight:700,fontSize:'12px'}}>TOTAL PAYABLE</span>
              <span style={{color:'#fff',fontWeight:800,fontSize:'15px'}}>₱{fmt(c.tot)}</span>
            </div>
          </div>
          <button onClick={()=>window.print()} style={{width:'100%',padding:'11px',border:'none',borderRadius:'6px',background:N,color:'#fff',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:'16px'}}>🖨️ Print / Export PDF</button>
        </div>
        <div className="pv-col" style={{flex:1,minWidth:'300px',overflow:'auto',maxHeight:'calc(100vh - 160px)'}}>
          <div className="pv-paper" style={{background:'#fff',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'24px 28px',fontFamily:'Arial,sans-serif',fontSize:'10.5pt',color:'#000',minHeight:'600px',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'3px double #000',paddingBottom:'12px',marginBottom:'14px'}}>
              <div style={{width:'64px',flexShrink:0}}>{logo1?<img src={logo1} alt="" style={CIRC}/>:<div style={CE}>LOGO</div>}</div>
              <div style={{textAlign:'center',flex:1,padding:'0 16px'}}>
                <div style={{fontSize:'13pt',fontWeight:'bold',letterSpacing:'.5px'}}>{company}</div>
                <div style={{fontSize:'9pt',color:'#555',marginTop:'3px'}}>{sub}</div>
                <div style={{fontSize:'11pt',fontWeight:'bold',marginTop:'7px',textTransform:'uppercase',letterSpacing:'1px'}}>Assessment Computation Worksheet</div>
              </div>
              <div style={{width:'64px',flexShrink:0,display:'flex',justifyContent:'flex-end'}}>{logo2?<img src={logo2} alt="" style={CIRC}/>:<div style={{...CE,marginLeft:'auto'}}>LOGO</div>}</div>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:'6px',fontSize:'9pt',padding:'5px 10px',background:'#f5f5f5',border:'1px solid #ddd',borderRadius:'4px',marginBottom:'14px'}}>
              <span><strong>Date:</strong> {today}</span>
              <span><strong>Incoterms:</strong> {f.incoterms}</span>
              <span><strong>Rate:</strong> ₱{f.exchange_rate}/USD</span>
              {c.deMin?<span style={{fontWeight:'bold',color:'#854d0e'}}>⚠ DE MINIMIS EXEMPT</span>:<span style={{fontWeight:'bold',color:AC}}>DRAFT — FOR REVIEW</span>}
            </div>
            <table style={PT}><tbody>
              <tr><td colSpan={4} style={PTH}>I. Document Reference</td></tr>
              <tr><td style={{...PT1,width:'22%'}}>B/L or AWB No.</td><td style={PT2}>{f.bl_number||'—'}</td><td style={{...PT1,width:'22%'}}>Invoice No.</td><td style={PT2}>{f.invoice_no||'—'}</td></tr>
              <tr><td style={PT1}>Container No.</td><td style={PT2}>{f.container_no||'—'}</td><td style={PT1}>Incoterms</td><td style={PT2}>{f.incoterms}</td></tr>
              <tr><td style={PT1}>Broker TIN</td><td style={PT2}>{f.broker_tin||'—'}</td><td style={PT1}>PRC License No.</td><td style={PT2}>{f.prc_no||'—'}</td></tr>
            </tbody></table>
            <table style={PT}><tbody>
              <tr><td colSpan={4} style={PTH}>II. Parties &amp; Commodity</td></tr>
              <tr><td style={{...PT1,width:'22%'}}>Importer</td><td style={PT2}>{f.importer||'—'}</td><td style={{...PT1,width:'22%'}}>Consignee</td><td style={PT2}>{f.consignee||'—'}</td></tr>
              <tr><td style={PT1}>Commodity</td><td style={PT2} colSpan={3}>{f.commodity||'—'}</td></tr>
              <tr><td style={PT1}>Country of Origin</td><td style={PT2}>{f.origin_country||'—'}</td><td style={PT1}>Port of Entry</td><td style={PT2}>{f.port||'—'}</td></tr>
            </tbody></table>
            <table style={PT}><tbody>
              <tr><td colSpan={2} style={PTH}>III. Dutiable Value — {FL} [Math.ceil — CMTA Sec. 700]</td></tr>
              <tr><td style={PT1}>{FL}</td><td style={PTV}>USD {fmt(pf(f.fob))}</td></tr>
              {!dF&&<tr><td style={PT1}>+ Freight</td><td style={PTV}>USD {fmt(pf(f.freight))}</td></tr>}
              {!dI&&<tr><td style={PT1}>+ Insurance</td><td style={PTV}>USD {fmt(pf(f.insurance))}</td></tr>}
              <tr><td style={{...PT1,fontWeight:'bold'}}>= CIF Value (USD)</td><td style={PTV}>USD {fmt(c.cu)}</td></tr>
              <tr><td style={PT1}>x Exchange Rate</td><td style={PTV}>₱{f.exchange_rate}/USD</td></tr>
              <tr><td style={PT1}>PHP Value (Raw)</td><td style={PTV}>₱{fmt(c.cp)}</td></tr>
              <tr style={{background:'#eff6ff'}}><td style={{...PT1,fontWeight:'bold',color:AC}}>ROUNDED DUTIABLE VALUE [Math.ceil]</td><td style={{...PTV,color:AC,fontSize:'11pt'}}>₱{fmt(c.rdv)}</td></tr>
              {c.deMin&&<tr style={{background:'#fef9c3'}}><td colSpan={2} style={{...PT1,fontWeight:'bold',color:'#854d0e',textAlign:'center'}}>⚠ DE MINIMIS — CMTA Sec. 423 (DV ≤ ₱10,000) — Duty &amp; VAT = ₱0.00</td></tr>}
            </tbody></table>
            <table style={PT}><tbody>
              <tr><td colSpan={2} style={PTH}>IV. Tax Computation — CMTA RA 10863 / TRAIN Law RA 10963</td></tr>
              <tr style={{background:'#f9f9f9'}}><td colSpan={2} style={{...PT1,fontSize:'8pt',fontWeight:700,color:'#777',textTransform:'uppercase'}}>A. Customs Duty</td></tr>
              <tr><td style={PT1}>Rounded DV x {f.duty_rate}% MFN Tariff Rate (AHTN 2022)</td><td style={PTV}>{c.deMin?<span style={{color:'#854d0e'}}>EXEMPT</span>:`₱${fmt(c.duty)}`}</td></tr>
              <tr style={{background:'#f9f9f9'}}><td colSpan={2} style={{...PT1,fontSize:'8pt',fontWeight:700,color:'#777',textTransform:'uppercase'}}>B. Excise Tax (NIRC)</td></tr>
              <tr><td style={PT1}>Excise Tax — As Declared</td><td style={PTV}>₱{fmt(c.ex)}</td></tr>
              <tr style={{background:'#f9f9f9'}}><td colSpan={2} style={{...PT1,fontSize:'8pt',fontWeight:700,color:'#777',textTransform:'uppercase'}}>C. Statutory Fees (CMO 26-2002)</td></tr>
              <tr><td style={PT1}>IPF — Import Processing Fee (DV Bracket: ₱{fmt(c.rdv)})</td><td style={PTV}>₱{fmt(c.ifee)}</td></tr>
              <tr><td style={PT1}>AEP — Arrastre + Examination + Wharfage</td><td style={PTV}>₱{fmt(c.aep)}</td></tr>
              <tr><td style={PT1}>CDS — Customs Documentary Stamp (Fixed)</td><td style={PTV}>₱{fmt(c.cds)}</td></tr>
              <tr><td style={PT1}>DST — BIR Documentary Stamp Tax (Fixed)</td><td style={PTV}>₱{fmt(c.dst)}</td></tr>
              {c.brok>0&&<tr><td style={PT1}>Brokerage / Professional Fee</td><td style={PTV}>₱{fmt(c.brok)}</td></tr>}
              <tr style={{background:'#f9f9f9'}}><td colSpan={2} style={{...PT1,fontSize:'8pt',fontWeight:700,color:'#777',textTransform:'uppercase'}}>D. Value-Added Tax — TRAIN Law (RA 10963)</td></tr>
              <tr><td style={{...PT1,fontSize:'8.5pt',color:'#888'}}>VAT Base = RDV + Duty + Excise + IPF + AEP + CDS + DST + Brokerage = ₱{fmt(c.vb)}</td><td style={PTV}></td></tr>
              <tr><td style={PT1}>VAT = VAT Base x 12%</td><td style={PTV}>{c.deMin?<span style={{color:'#854d0e'}}>EXEMPT</span>:`₱${fmt(c.vat)}`}</td></tr>
            </tbody></table>
            <table style={{...PT,marginBottom:'10px'}}><tbody>
              <tr style={{background:'#111',color:'#fff'}}>
                <td style={{padding:'10px 14px',border:'1px solid #000',fontWeight:'bold',fontSize:'12pt'}}>TOTAL ASSESSMENT PAYABLE</td>
                <td style={{padding:'10px 14px',border:'1px solid #000',textAlign:'right',fontWeight:'bold',fontSize:'14pt',width:'175px'}}>₱{fmt(c.tot)}</td>
              </tr>
            </tbody></table>
            <div style={{marginBottom:'14px',fontSize:'8.5pt',color:'#555'}}>
              <strong>IPF Schedule Ref:</strong>&nbsp;
              {[['≤₱250k','₱250',c.rdv<=250000],['₱250k–₱500k','₱500',c.rdv>250000&&c.rdv<=500000],['₱500k–₱750k','₱750',c.rdv>500000&&c.rdv<=750000],['>₱750k','₱1,000',c.rdv>750000]].map(([r,v,on],i)=>(
                <span key={i} style={{display:'inline-block',margin:'3px 3px 0 0',padding:'2px 7px',background:on?'#dbeafe':'#f5f5f5',border:on?'1px solid #3b82f6':'1px solid #ddd',borderRadius:'3px',fontWeight:on?700:400,color:on?AC:'#555'}}>{r} → <strong>{v}</strong></span>
              ))}
            </div>
            <div style={{marginTop:'24px',borderTop:'1px dashed #ccc',paddingTop:'12px'}}>
              {sigData?<img src={sigData} alt="Sig" style={{height:'56px',display:'block',border:'none',marginBottom:'4px'}}/>:<div style={{height:'56px',borderBottom:'1px solid #000',marginBottom:'4px',display:'flex',alignItems:'flex-end'}}><span style={{fontSize:'8pt',color:'#aaa',marginBottom:'2px'}}>Signature over Printed Name</span></div>}
              <div style={{fontSize:'10pt',fontWeight:'bold'}}>{f.declarant_name||'_________________________________'}</div>
              <div style={{fontSize:'8.5pt',color:'#555',marginTop:'2px'}}>Customs Broker / Declarant — PRC Lic. No.: {f.prc_no||'_____________'}</div>
            </div>
            <div style={{marginTop:'18px',paddingTop:'8px',borderTop:'1px solid #ccc',textAlign:'center',fontSize:'7.5pt',color:'#888'}}>
              <strong>{company}</strong> — Generated: {today} | Computational worksheet only. Figures are estimates. Final assessment subject to official regulatory review.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
