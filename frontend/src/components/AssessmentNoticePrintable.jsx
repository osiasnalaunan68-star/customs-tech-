import { useState, useEffect, useRef } from 'react'

const N='#0d2a4e', AC='#1e40af', BD='#e2e8f0', SL='#475569'
const fmt = n => (n||0).toLocaleString('en-PH',{minimumFractionDigits:2})
const pf  = (s,d=0) => parseFloat(s)||d

function getIPF(dv) {
  if (dv<=250000) return 250
  if (dv<=500000) return 500
  if (dv<=750000) return 750
  return 1000
}

function doCalc(f) {
  const inco=f.incoterms||'CIF', base=pf(f.fob)
  const cu = inco==='CIF' ? base
           : inco==='CFR' ? base+pf(f.insurance)
           : base+pf(f.freight)+pf(f.insurance)
  const cp=cu*pf(f.exchange_rate,56), rdv=Math.ceil(cp)
  const duty=rdv*(pf(f.duty_rate)/100), ex=pf(f.excise_tax)
  const ifee=getIPF(rdv), aep=pf(f.aep,1500), brok=pf(f.brokerage)
  const vb=rdv+duty+ex+ifee+aep, vat=vb*0.12
  return {cu,cp,rdv,duty,ex,ifee,aep,brok,vb,vat,tot:duty+ex+vat+ifee+aep+brok}
}

const INIT={
  bl_number:'',invoice_no:'',container_no:'',broker_tin:'',prc_no:'',incoterms:'CIF',
  importer:'',consignee:'',commodity:'',origin_country:'',port:'Manila',declarant_name:'',
  fob:'',freight:'0',insurance:'0',exchange_rate:'56.00',
  duty_rate:'0',excise_tax:'0',aep:'1500',brokerage:'0',
}

const PCSS=`@media print{
.ed-col{display:none!important}
.pv-col{width:100%!important;max-width:none!important;flex:none!important}
.pv-paper{border:none!important;box-shadow:none!important;padding:0!important;margin:0!important}
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

export default function AssessmentNoticePrintable() {
  const [f,setF]         = useState(INIT)
  const [c,setC]         = useState(doCalc(INIT))
  const [logo1,setL1]    = useState(null)
  const [logo2,setL2]    = useState(null)
  const [company,setCo]  = useState('Assessment Document Builder')
  const [sub,setSub]     = useState('Professional Customs Brokerage Computation Tool')
  const [sigData,setSig] = useState(null)
  const [lu,setLu]       = useState('')
  const cvs=useRef(null), lp=useRef(null), drawing=useRef(false)

  useEffect(()=>setC(doCalc(f)),[f])

  function readImg(e,setter){
    const file=e.target.files[0]; if(!file) return
    const r=new FileReader(); r.onload=ev=>setter(ev.target.result); r.readAsDataURL(file)
  }
  function getPos(e){
    const el=cvs.current, rect=el.getBoundingClientRect()
    return {x:(e.clientX-rect.left)*(el.width/rect.width), y:(e.clientY-rect.top)*(el.height/rect.height)}
  }
  function onPD(e){
    e.preventDefault(); drawing.current=true; const pos=getPos(e); lp.current=pos
    const ctx=cvs.current.getContext('2d')
    ctx.beginPath(); ctx.arc(pos.x,pos.y,1.5,0,Math.PI*2); ctx.fillStyle='#1e40af'; ctx.fill()
  }
  function onPM(e){
    if(!drawing.current) return; e.preventDefault()
    const pos=getPos(e), ctx=cvs.current.getContext('2d')
    ctx.beginPath(); ctx.moveTo(lp.current.x,lp.current.y); ctx.lineTo(pos.x,pos.y)
    ctx.strokeStyle='#1e40af'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.stroke()
    lp.current=pos
  }
  function onPU(){ if(!drawing.current) return; drawing.current=false; setSig(cvs.current.toDataURL()) }
  function clearSig(){ const ctx=cvs.current.getContext('2d'); ctx.clearRect(0,0,cvs.current.width,cvs.current.height); setSig(null) }
  function set(k,v){ setF(p=>({...p,[k]:v})); if(k==='exchange_rate') setLu(new Date().toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})) }

  const today=new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})
  const inco=f.incoterms||'CIF', dF=inco==='CIF'||inco==='CFR', dI=inco==='CIF'
  const FL=inco==='CIF'?'CIF (USD)':inco==='CFR'?'CFR (USD)':'FOB (USD)'
  const CIRC={width:'64px',height:'64px',borderRadius:'50%',objectFit:'cover',border:'2px solid '+BD,display:'block'}
  const CE={...CIRC,background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',color:'#94a3b8',fontSize:'9px',fontWeight:700}
  const TD1={padding:'5px 10px',border:'1px solid #ccc',fontSize:'9.5pt',color:'#555'}
  const TD2={padding:'5px 10px',border:'1px solid #ccc',fontSize:'9.5pt',fontWeight:600}
  const TV={padding:'5px 10px',border:'1px solid #ccc',fontSize:'9.5pt',fontWeight:'bold',textAlign:'right',width:'160px'}
  const TH={padding:'4px 10px',fontWeight:800,fontSize:'8pt',textTransform:'uppercase',letterSpacing:'.3px',borderLeft:'3px solid #444',color:'#333',background:'#efefef'}
  const TBL={width:'100%',borderCollapse:'collapse',marginBottom:'12px'}

  return (
    <div style={{fontFamily:'Inter,system-ui,sans-serif',color:'#0f172a'}}>
      <style>{PCSS}</style>
      <div style={{display:'flex',gap:'14px',alignItems:'flex-start',flexWrap:'wrap'}}>

        {/* ── EDITOR (Left Column) ── */}
        <div className="ed-col" style={{width:'330px',flexShrink:0,overflowY:'auto',maxHeight:'calc(100vh - 160px)'}}>

          <div style={CD}>
            <div style={SC}>Custom Branding</div>
            <div style={G2}>
              <div style={FG}>
                <label style={LB}>Logo Left</label>
                <input type="file" accept="image/*" style={{fontSize:'11px'}} onChange={e=>readImg(e,setL1)}/>
                {logo1&&<img src={logo1} alt="" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',marginTop:'4px'}}/>}
              </div>
              <div style={FG}>
                <label style={LB}>Logo Right</label>
                <input type="file" accept="image/*" style={{fontSize:'11px'}} onChange={e=>readImg(e,setL2)}/>
                {logo2&&<img src={logo2} alt="" style={{width:'40px',height:'40px',borderRadius:'50%',objectFit:'cover',marginTop:'4px'}}/>}
              </div>
            </div>
            <div style={FG}><label style={LB}>Company / Firm Name</label><input style={inp(false)} value={company} onChange={e=>setCo(e.target.value)}/></div>
            <div style={FG}><label style={LB}>Sub-header / Tagline</label><input style={inp(false)} value={sub} onChange={e=>setSub(e.target.value)}/></div>
          </div>

          <div style={CD}>
            <div style={SC}>Document Reference</div>
            <div style={G2}>
              <div style={FG}><label style={LB}>B/L or AWB No.</label><input style={inp(false)} value={f.bl_number} onChange={e=>set('bl_number',e.target.value)} placeholder="e.g. MAEU12345"/></div>
              <div style={FG}><label style={LB}>Invoice No.</label><input style={inp(false)} value={f.invoice_no} onChange={e=>set('invoice_no',e.target.value)} placeholder="INV-2024-001"/></div>
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
            <div style={SC}>Valuation — {FL}</div>
            <div style={G2}>
              <div style={FG}><label style={LB}>{FL} *</label><input style={inp(false)} type="number" value={f.fob} onChange={e=>set('fob',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Freight (USD)</label><input style={inp(dF)} type="number" value={f.freight} onChange={e=>set('freight',e.target.value)} disabled={dF}/></div>
              <div style={FG}><label style={LB}>Insurance (USD)</label><input style={inp(dI)} type="number" value={f.insurance} onChange={e=>set('insurance',e.target.value)} disabled={dI}/></div>
              <div style={FG}>
                <label style={LB}>Exchange Rate (₱/USD)</label>
                <input style={inp(false)} type="number" value={f.exchange_rate} onChange={e=>set('exchange_rate',e.target.value)}/>
                {lu&&<span style={{fontSize:'10px',color:'#22c55e',marginTop:'2px'}}>✓ Updated {lu}</span>}
              </div>
              <div style={FG}><label style={LB}>MFN Tariff Rate (%)</label><input style={inp(false)} type="number" value={f.duty_rate} onChange={e=>set('duty_rate',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Excise Tax (₱)</label><input style={inp(false)} type="number" value={f.excise_tax} onChange={e=>set('excise_tax',e.target.value)}/></div>
              <div style={FG}><label style={LB}>AEP (₱)</label><input style={inp(false)} type="number" value={f.aep} onChange={e=>set('aep',e.target.value)}/></div>
              <div style={FG}><label style={LB}>Brokerage Fee (₱)</label><input style={inp(false)} type="number" value={f.brokerage} onChange={e=>set('brokerage',e.target.value)}/></div>
            </div>
          </div>

          <div style={CD}>
            <div style={SC}>Digital Signature</div>
            <div style={{fontSize:'10px',color:'#94a3b8',marginBottom:'5px'}}>Draw with mouse or finger ↓</div>
            <canvas ref={cvs} width={480} height={120}
              style={{width:'100%',height:'120px',border:'1px solid '+BD,borderRadius:'4px',background:'#fafcff',touchAction:'none',cursor:'crosshair',display:'block'}}
              onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU}/>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'6px'}}>
              <button onClick={clearSig} style={{padding:'4px 12px',border:'1px solid '+BD,borderRadius:'4px',background:'#fff',color:SL,fontSize:'12px',cursor:'pointer',fontFamily:'inherit'}}>✕ Clear</button>
              {sigData&&<span style={{fontSize:'11px',color:'#22c55e',fontWeight:600}}>✓ Signature captured</span>}
            </div>
            <div style={{...FG,marginTop:'10px'}}>
              <label style={LB}>Declarant / Broker Name</label>
              <input style={inp(false)} value={f.declarant_name} onChange={e=>set('declarant_name',e.target.value)} placeholder="Full name of signatory"/>
            </div>
          </div>

          <div style={{...CD,border:'2px solid '+N,background:'#eff6ff'}}>
            <div style={SC}>Live Assessment</div>
            {[['Customs Duty',c.duty],['Excise Tax',c.ex],['VAT (12%)',c.vat],['IPF',c.ifee],['AEP',c.aep],['Brokerage',c.brok]].map(([n,v],i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid '+BD,fontSize:'12px'}}>
                <span style={{color:SL}}>{n}</span><span style={{fontWeight:600}}>₱{fmt(v)}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px',padding:'8px 10px',background:N,borderRadius:'5px'}}>
              <span style={{color:'#93c5fd',fontWeight:700,fontSize:'12px'}}>TOTAL PAYABLE</span>
              <span style={{color:'#fff',fontWeight:800,fontSize:'15px'}}>₱{fmt(c.tot)}</span>
            </div>
          </div>

          <button onClick={()=>window.print()} style={{width:'100%',padding:'11px',border:'none',borderRadius:'6px',background:N,color:'#fff',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'inherit',marginBottom:'16px'}}>
            🖨️ Print / Export PDF
          </button>
        </div>

        {/* ── LIVE PREVIEW (Right Column) ── */}
        <div className="pv-col" style={{flex:1,minWidth:'300px',overflow:'auto',maxHeight:'calc(100vh - 160px)'}}>
          <div className="pv-paper" style={{background:'#fff',border:'1px solid #cbd5e1',borderRadius:'6px',padding:'24px 28px',fontFamily:'Arial,sans-serif',fontSize:'10.5pt',color:'#000',minHeight:'600px',boxShadow:'0 1px 4px rgba(0,0,0,.07)'}}>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'3px double #000',paddingBottom:'12px',marginBottom:'14px'}}>
              <div style={{width:'64px',flexShrink:0}}>
                {logo1 ? <img src={logo1} alt="" style={CIRC}/> : <div style={CE}>LOGO</div>}
              </div>
              <div style={{textAlign:'center',flex:1,padding:'0 16px'}}>
                <div style={{fontSize:'13pt',fontWeight:'bold',letterSpacing:'.5px'}}>{company}</div>
                <div style={{fontSize:'9pt',color:'#555',marginTop:'3px'}}>{sub}</div>
                <div style={{fontSize:'11pt',fontWeight:'bold',marginTop:'7px',textTransform:'uppercase',letterSpacing:'1px'}}>Assessment Computation Worksheet</div>
              </div>
              <div style={{width:'64px',flexShrink:0,display:'flex',justifyContent:'flex-end'}}>
                {logo2 ? <img src={logo2} alt="" style={CIRC}/> : <div style={{...CE,marginLeft:'auto'}}>LOGO</div>}
              </div>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:'6px',fontSize:'9pt',padding:'5px 10px',background:'#f5f5f5',border:'1px solid #ddd',borderRadius:'4px',marginBottom:'14px'}}>
              <span><strong>Date:</strong> {today}</span>
              <span><strong>Incoterms:</strong> {f.incoterms}</span>
              <span><strong>BSP Rate:</strong> ₱{f.exchange_rate}/USD</span>
              <span style={{fontWeight:'bold',color:AC}}>DRAFT — FOR REVIEW</span>
            </div>

            <table style={TBL}>
              <tbody>
                <tr><td colSpan={4} style={TH}>I. Document Reference</td></tr>
                <tr><td style={{...TD1,width:'22%'}}>B/L or AWB No.</td><td style={TD2}>{f.bl_number||'—'}</td><td style={{...TD1,width:'22%'}}>Invoice No.</td><td style={TD2}>{f.invoice_no||'—'}</td></tr>
                <tr><td style={TD1}>Container No.</td><td style={TD2}>{f.container_no||'—'}</td><td style={TD1}>Incoterms</td><td style={TD2}>{f.incoterms}</td></tr>
                <tr><td style={TD1}>Broker TIN</td><td style={TD2}>{f.broker_tin||'—'}</td><td style={TD1}>PRC License No.</td><td style={TD2}>{f.prc_no||'—'}</td></tr>
              </tbody>
            </table>

            <table style={TBL}>
              <tbody>
                <tr><td colSpan={4} style={TH}>II. Parties &amp; Commodity</td></tr>
                <tr><td style={{...TD1,width:'22%'}}>Importer of Record</td><td style={TD2}>{f.importer||'—'}</td><td style={{...TD1,width:'22%'}}>Consignee</td><td style={TD2}>{f.consignee||'—'}</td></tr>
                <tr><td style={TD1}>Commodity</td><td style={{...TD2}} colSpan={3}>{f.commodity||'—'}</td></tr>
                <tr><td style={TD1}>Country of Origin</td><td style={TD2}>{f.origin_country||'—'}</td><td style={TD1}>Port of Entry</td><td style={TD2}>{f.port||'—'}</td></tr>
              </tbody>
            </table>

            <table style={TBL}>
              <tbody>
                <tr><td colSpan={2} style={TH}>III. Dutiable Value — {FL} [Math.ceil applied per CMTA Sec. 700]</td></tr>
                <tr><td style={TD1}>{FL}</td><td style={TV}>USD {fmt(pf(f.fob))}</td></tr>
                {!dF&&<tr><td style={TD1}>+ Freight Charges</td><td style={TV}>USD {fmt(pf(f.freight))}</td></tr>}
                {!dI&&<tr><td style={TD1}>+ Insurance</td><td style={TV}>USD {fmt(pf(f.insurance))}</td></tr>}
                <tr><td style={{...TD1,fontWeight:'bold'}}>= CIF Value (USD)</td><td style={TV}>USD {fmt(c.cu)}</td></tr>
                <tr><td style={TD1}>× Exchange Rate</td><td style={TV}>₱{f.exchange_rate}/USD</td></tr>
                <tr><td style={TD1}>CIF Value (PHP) — Raw</td><td style={TV}>₱{fmt(c.cp)}</td></tr>
                <tr style={{background:'#eff6ff'}}><td style={{...TD1,fontWeight:'bold',color:AC}}>ROUNDED DUTIABLE VALUE [Math.ceil]</td><td style={{...TV,color:AC,fontSize:'11pt'}}>₱{fmt(c.rdv)}</td></tr>
              </tbody>
            </table>

            <table style={TBL}>
              <tbody>
                <tr><td colSpan={2} style={TH}>IV. Tax Computation</td></tr>
                <tr style={{background:'#f9f9f9'}}><td colSpan={2} style={{...TD1,fontSize:'8pt',fontWeight:700,color:'#888',textTransform:'uppercase'}}>A. Customs Duty</td></tr>
                <tr><td style={TD1}>Rounded DV × {f.duty_rate}% MFN Tariff Rate</td><td style={TV}>₱{fmt(c.duty)}</td></tr>
                <tr style={{background:'#f9f9f9'}}><td colSpan={2} style={{...TD1,fontSize:'8pt',fontWeight:700,color:'#888',textTransform:'uppercase'}}>B. Excise Tax</td></tr>
                <tr><td style={TD1}>Excise Tax — As Declared</td><td style={TV}>₱{fmt(c.ex)}</td></tr>
                <tr style={{background:'#f9f9f9'}}><td colSpan={2} style={{...TD1,fontSize:'8pt',fontWeight:700,color:'#888',textTransform:'uppercase'}}>C. Processing Fees</td></tr>
                <tr><td style={TD1}>IPF — Import Processing Fee (DV Bracket: ₱{fmt(c.rdv)})</td><td style={TV}>₱{fmt(c.ifee)}</td></tr>
                <tr><td style={TD1}>AEP — Arrastre + Examination + Wharfage</td><td style={TV}>₱{fmt(c.aep)}</td></tr>
                <tr style={{background:'#f9f9f9'}}><td colSpan={2} style={{...TD1,fontSize:'8pt',fontWeight:700,color:'#888',textTransform:'uppercase'}}>D. Value-Added Tax — TRAIN Law</td></tr>
                <tr><td style={TD1}>VAT Base = Rounded DV + Duty + Excise + IPF + AEP</td><td style={TV}>₱{fmt(c.vb)}</td></tr>
                <tr><td style={TD1}>VAT = VAT Base × 12%</td><td style={TV}>₱{fmt(c.vat)}</td></tr>
                {c.brok>0&&<tr><td style={TD1}>Brokerage / Professional Fee</td><td style={TV}>₱{fmt(c.brok)}</td></tr>}
              </tbody>
            </table>

            <table style={{...TBL,marginBottom:'10px'}}>
              <tbody><tr style={{background:'#111',color:'#fff'}}>
                <td style={{padding:'10px 14px',border:'1px solid #000',fontWeight:'bold',fontSize:'12pt'}}>TOTAL ASSESSMENT PAYABLE</td>
                <td style={{padding:'10px 14px',border:'1px solid #000',textAlign:'right',fontWeight:'bold',fontSize:'14pt',width:'175px'}}>₱{fmt(c.tot)}</td>
              </tr></tbody>
            </table>

            <div style={{marginBottom:'14px',fontSize:'8.5pt',color:'#555'}}>
              <strong>IPF Schedule Reference:</strong>
              {[['≤ ₱250k','₱250',c.rdv<=250000],['₱250k–₱500k','₱500',c.rdv>250000&&c.rdv<=500000],['₱500k–₱750k','₱750',c.rdv>500000&&c.rdv<=750000],['>₱750k','₱1,000',c.rdv>750000]].map(([r,v,on],i)=>(
                <span key={i} style={{display:'inline-block',margin:'4px 4px 0 0',padding:'2px 8px',background:on?'#dbeafe':'#f5f5f5',border:on?'1px solid #3b82f6':'1px solid #ddd',borderRadius:'3px',fontWeight:on?700:400,color:on?AC:'#555'}}>
                  {r} → <strong>{v}</strong>
                </span>
              ))}
            </div>

            <div style={{marginTop:'24px',borderTop:'1px dashed #ccc',paddingTop:'12px'}}>
              {sigData ? (
                <div style={{marginBottom:'4px'}}>
                  <img src={sigData} alt="Signature" style={{height:'56px',display:'block',border:'none'}}/>
                </div>
              ) : (
                <div style={{height:'56px',borderBottom:'1px solid #000',marginBottom:'4px',display:'flex',alignItems:'flex-end'}}>
                  <span style={{fontSize:'8pt',color:'#aaa',marginBottom:'2px'}}>Signature over Printed Name</span>
                </div>
              )}
              <div style={{fontSize:'10pt',fontWeight:'bold'}}>{f.declarant_name||'_________________________________'}</div>
              <div style={{fontSize:'8.5pt',color:'#555',marginTop:'2px'}}>Customs Broker / Declarant — PRC Lic. No.: {f.prc_no||'_____________'}</div>
            </div>

            <div style={{marginTop:'18px',paddingTop:'8px',borderTop:'1px solid #ccc',textAlign:'center',fontSize:'7.5pt',color:'#888'}}>
              <strong>{company}</strong> — Generated: {today} |
              Computational worksheet only. Figures are estimates for brokerage purposes.
              Final assessment subject to official regulatory review.
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
