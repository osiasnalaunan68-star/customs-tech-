import { useState } from 'react'
import { api } from '../lib/api'
export default function Classifier() {
  const [desc, setDesc] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  async function classify() {
    if (!desc.trim()) return
    setLoading(true); setErr(''); setResult(null)
    try {
      const data = await api.post('/classifier/classify', { description: desc })
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch(e) { setErr(e.message||'Classification failed') }
    setLoading(false)
  }
  return (
    <div className="card">
      <div className="card-h">
        <span className="card-t">✦ AI HS Code Classifier</span>
        <span style={{fontSize:'11px',color:'var(--text3)'}}>Claude AI • AHTN 2022</span>
      </div>
      <div className="fg">
        <label className="fl">Product Description</label>
        <textarea className="input" rows={4} style={{resize:'vertical'}}
          placeholder="Describe your product in detail. Example: 'Fresh cavendish bananas, not dried, unprocessed, for retail sale' or 'Bolts made of stainless steel, 10mm diameter, for machinery'"
          value={desc} onChange={e=>setDesc(e.target.value)}/>
      </div>
      <button className="btn btn-primary" onClick={classify} disabled={loading||!desc.trim()}>
        {loading?'Classifying with AI...':'✦ Classify Product'}
      </button>
      {err&&<div className="err" style={{marginTop:'12px'}}>{err}</div>}
      {result&&(
        <div style={{marginTop:'20px'}}>
          <div className="result-box">
            <div className="result-row"><span>HS Code</span><span className="code" style={{fontSize:'15px',fontWeight:700}}>{result.hs_code}</span></div>
            <div className="result-row"><span>Heading</span><span>{result.heading}</span></div>
            <div className="result-row"><span>Official Description</span><span style={{textAlign:'right',maxWidth:'60%',fontSize:'12px'}}>{result.description}</span></div>
            <div className="result-row"><span>Confidence</span><span><span className="badge">{Math.round((result.confidence||0)*100)}%</span></span></div>
          </div>
          {result.reasoning&&(
            <div style={{marginTop:'12px',padding:'12px',background:'var(--surface2)',borderRadius:'var(--r)'}}>
              <div className="fl" style={{marginBottom:'6px'}}>AI Reasoning</div>
              <p style={{fontSize:'13px',color:'var(--text2)',lineHeight:'1.6'}}>{result.reasoning}</p>
            </div>
          )}
          {result.alternatives?.length>0&&(
            <div style={{marginTop:'12px'}}>
              <div className="fl" style={{marginBottom:'6px'}}>Alternative Codes</div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {result.alternatives.map((a,i)=><span key={i} className="code">{a}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
