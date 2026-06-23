import { useState, useEffect } from 'react'
import { api } from '../lib/api'
const fmt = n => (n||0).toLocaleString('en-PH',{minimumFractionDigits:2})
export default function Dashboard() {
  const [stats, setStats] = useState({clients:0,shipments:0,entries:0,total:0})
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    Promise.all([api.get('/clients'),api.get('/shipments'),api.get('/entries')])
      .then(([c,s,e])=>{
        setStats({clients:c.length,shipments:s.length,entries:e.length,total:e.reduce((sum,x)=>sum+(x.total_payable||0),0)})
        setRecent(e.slice(0,5))
      }).catch(()=>{}).finally(()=>setLoading(false))
  },[])
  if (loading) return <div className="loading"><div className="spin"/></div>
  return (
    <>
      <div className="stats">
        <div className="stat"><div className="stat-l">Clients</div><div className="stat-v">{stats.clients}</div></div>
        <div className="stat"><div className="stat-l">Shipments</div><div className="stat-v">{stats.shipments}</div></div>
        <div className="stat"><div className="stat-l">Entries</div><div className="stat-v">{stats.entries}</div></div>
        <div className="stat"><div className="stat-l">Total Duties (PHP)</div><div className="stat-v" style={{fontSize:'18px'}}>₱{fmt(stats.total)}</div></div>
      </div>
      <div className="card">
        <div className="card-h"><span className="card-t">Recent Entries</span></div>
        {recent.length===0?<div className="empty">No entries yet. Start by looking up an HS code.</div>:(
          <div className="tw"><table>
            <thead><tr><th>Entry No</th><th>HS Code</th><th>Description</th><th>Total (PHP)</th></tr></thead>
            <tbody>{recent.map(e=>(
              <tr key={e.id}>
                <td><span className="code">{e.entry_no||'—'}</span></td>
                <td><span className="code">{e.ahtn_code||'—'}</span></td>
                <td>{e.description||'—'}</td>
                <td style={{fontWeight:600}}>₱{fmt(e.total_payable)}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  )
}
