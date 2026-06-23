import { useState } from 'react'
import CPRSForm from './CPRSForm'
import AssessmentNoticePrintable from './AssessmentNoticePrintable'

const MODULES = [
  { id:'cprs', code:'CPRS', sub:'Accreditation', name:'Client Profile Registration', icon:'🪪', active:true },
  { id:'ias', code:'IAS', sub:'Assessment Lodgment', name:'Import Assessment', icon:'📋', active:true },
  { id:'pmts', code:'PMTS', sub:'Automated Payment', name:'Payment Management', icon:'💳', active:false },
  { id:'ems', code:'EMS', sub:'Manifest System', name:'Electronic Manifest', icon:'🚢', active:false }
]

function Placeholder({ code, name }) {
  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'420px',padding:'60px 24px',textAlign:'center'}}>
      <div style={{fontSize:'56px',marginBottom:'20px',opacity:.2}}>🔧</div>
      <div style={{fontSize:'17px',fontWeight:700,color:'#0d2a4e',marginBottom:'10px'}}>{code} — {name}</div>
      <div style={{color:'#64748b',fontSize:'13px',maxWidth:'360px',lineHeight:1.75}}>Module under development for e2m Phase 2.</div>
    </div>
  )
}

export default function DashboardLayout() {
  const [active, setActive] = useState('cprs')
  const cur = MODULES.find(m => m.id === active)

  return (
    <div style={{display:'flex',minHeight:'calc(100vh - 130px)',borderRadius:'8px',overflow:'hidden',border:'1px solid #cbd5e1',background:'#f1f5f9'}}>
      <aside style={{width:'252px',background:'#0d2a4e',flexShrink:0,display:'flex',flexDirection:'column'}}>
        <div style={{padding:'18px 16px',borderBottom:'1px solid #1e3d6f'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'38px',height:'38px',background:'#1a3d6b',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>⚓</div>
            <div>
              <div style={{color:'#fff',fontWeight:800,fontSize:'13px'}}>e2m CUSTOMS</div>
              <div style={{color:'#93c5fd',fontSize:'9px'}}>BOC PLATFORM</div>
            </div>
          </div>
        </div>
        <nav style={{flex:1,padding:'16px 8px'}}>
          {MODULES.map(m => {
            const on = active === m.id
            return (
              <button key={m.id} onClick={() => m.active && setActive(m.id)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'7px',border:'none',cursor: m.active ? 'pointer' : 'not-allowed',marginBottom:'3px',textAlign:'left',background: on ? 'rgba(255,255,255,.13)' : 'transparent',borderLeft: on ? '3px solid #38bdf8' : '3px solid transparent',opacity: m.active ? 1 : .42}}>
                <span style={{fontSize:'15px'}}>{m.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:'12px',fontWeight:700,color: on ? '#fff' : '#93c5fd'}}>{m.code}</div>
                  <div style={{fontSize:'9.5px',color: on ? '#bfdbfe' : '#3a6d9e'}}>{m.sub}</div>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{background:'#fff',borderBottom:'2px solid #e2e8f0',padding:'14px 24px',display:'flex',alignItems:'center'}}>
          <span style={{fontSize:'24px',marginRight:'14px'}}>{cur?.icon}</span>
          <div>
            <div style={{fontSize:'15px',fontWeight:700,color:'#0d2a4e'}}>{cur?.name}</div>
            <div style={{fontSize:'11px',color:'#64748b'}}>e2m Customs System / {cur?.code}</div>
          </div>
        </div>
        <div style={{flex:1,overflow:'auto',background:'#f8fafc'}}>
          {active === 'cprs' && <CPRSForm />}
          {active === 'ias'  && <AssessmentNoticePrintable />}
          {active === 'pmts' && <Placeholder code="PMTS" name="Payment Management System" />}
          {active === 'ems' && <Placeholder code="EMS" name="Electronic Manifest System" />}
        </div>
      </div>
    </div>
  )
}
