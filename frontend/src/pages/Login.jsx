import { useState } from 'react'
import { supabase } from '../lib/supabase'
export default function Login({ theme, toggleTheme }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  async function handle() {
    setLoading(true); setErr(''); setOk('')
    try {
      if (tab==='login') {
        const {error} = await supabase.auth.signInWithPassword({email, password:pw})
        if (error) throw error
      } else {
        const {error} = await supabase.auth.signUp({email, password:pw})
        if (error) throw error
        setOk('Check your email to confirm your account.')
      }
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }
  return (
    <div className="login-wrap">
      <div className="login-box">
        <div className="login-logo">
          <h1>Customs Tech</h1>
          <p>by Osias.org — Philippines Customs Platform</p>
        </div>
        <div className="tabs">
          <button className={`tab${tab==='login'?' active':''}`} onClick={()=>setTab('login')}>Sign In</button>
          <button className={`tab${tab==='signup'?' active':''}`} onClick={()=>setTab('signup')}>Sign Up</button>
        </div>
        {err && <div className="err">{err}</div>}
        {ok && <div className="ok">{ok}</div>}
        <div className="fg"><label className="fl">Email</label>
          <input className="input" type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)}/></div>
        <div className="fg"><label className="fl">Password</label>
          <input className="input" type="password" placeholder="••••••••" value={pw} onChange={e=>setPw(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&handle()}/></div>
        <button className="btn btn-primary" style={{width:'100%'}} onClick={handle} disabled={loading}>
          {loading?'Please wait...':(tab==='login'?'Sign In':'Create Account')}
        </button>
        <div style={{textAlign:'center',marginTop:'16px'}}>
          <button className="btn btn-ghost btn-sm" onClick={toggleTheme}>{theme==='light'?'🌙 Dark':'☀️ Light'} Mode</button>
        </div>
      </div>
    </div>
  )
}
