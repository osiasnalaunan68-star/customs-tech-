import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import HSLookup from './pages/HSLookup'
import DutyCalculator from './pages/DutyCalculator'
import Clients from './pages/Clients'
import Shipments from './pages/Shipments'
import Entries from './pages/Entries'
import Settings from './pages/Settings'

const NAV = [
  { id:'dashboard',  label:'Dashboard',       icon:'◼', g:'Overview' },
  { id:'hs-lookup',  label:'HS Code Lookup',  icon:'🔍', g:'Tariff Tools' },
  { id:'calculator', label:'Duty Calculator', icon:'🧮', g:'Tariff Tools' },
  { id:'clients',    label:'Clients',         icon:'👥', g:'Broker Tools' },
  { id:'shipments',  label:'Shipments',       icon:'🚢', g:'Broker Tools' },
  { id:'entries',    label:'Entry Worksheets',icon:'📄', g:'Broker Tools' },
  { id:'settings',   label:'Settings',        icon:'⚙️', g:'Account' },
]

const MNAV = [
  { id:'hs-lookup',  label:'HS',        icon:'🔍' },
  { id:'calculator', label:'Calc',      icon:'🧮' },
  { id:'entries',    label:'Entries',   icon:'📄' },
  { id:'dashboard',  label:'Home',      icon:'◼' },
]

function Page({ p }) {
  if (p==='dashboard')  return <Dashboard/>
  if (p==='hs-lookup')  return <HSLookup/>
  if (p==='calculator') return <DutyCalculator/>
  if (p==='clients')    return <Clients/>
  if (p==='shipments')  return <Shipments/>
  if (p==='entries')    return <Entries/>
  if (p==='settings')   return <Settings/>
  return <Dashboard/>
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('hs-lookup')
  const [theme, setTheme] = useState(localStorage.getItem('ct-theme')||'dark')

  useEffect(() => {
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false)})
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,s)=>setSession(s))
    return ()=>subscription.unsubscribe()
  },[])

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme',theme)
    localStorage.setItem('ct-theme',theme)
  },[theme])

  if (loading) return <div className="loading"><div className="spin"/></div>
  if (!session) return <Login theme={theme} toggleTheme={()=>setTheme(t=>t==='light'?'dark':'light')}/>

  const groups=[...new Set(NAV.map(n=>n.g))]
  const cur=NAV.find(n=>n.id===page)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><h1>Customs Tech</h1><p>by Osias.org</p></div>
        <nav className="nav">
          {groups.map(g=>(
            <div key={g}>
              <div className="nav-sec">{g}</div>
              {NAV.filter(n=>n.g===g).map(item=>(
                <button key={item.id} className={`nav-item${page===item.id?' active':''}`} onClick={()=>setPage(item.id)}>
                  <span>{item.icon}</span>{item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div style={{padding:'16px',borderTop:'1px solid var(--border)'}}>
          <button className="btn btn-ghost btn-sm" style={{width:'100%'}} onClick={()=>supabase.auth.signOut()}>Sign Out</button>
        </div>
      </aside>
      <main className="main">
        <div className="topbar">
          <h2>{cur?.label}</h2>
          <div className="topbar-r">
            <button className="btn btn-ghost btn-sm" onClick={()=>setTheme(t=>t==='light'?'dark':'light')}>{theme==='light'?'🌙':'☀️'}</button>
            <span style={{fontSize:'12px',color:'var(--text3)'}}>{session.user.email}</span>
          </div>
        </div>
        <div className="page"><Page p={page}/></div>
      </main>
      <nav className="mnav">
        <div className="mnav-items">
          {MNAV.map(item=>(
            <button key={item.id} className={`mnav-item${page===item.id?' active':''}`} onClick={()=>setPage(item.id)}>
              <span style={{fontSize:'20px'}}>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
