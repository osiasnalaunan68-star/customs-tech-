import React, { useState } from 'react';

export default function CPRSForm() {
  const [formData, setFormData] = useState({
    applicant_name: '', company_name: '', tin: '', client_type: 'Importer'
  });
  const [ccn, setCcn] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setCcn(`CCN-${Math.floor(1000000 + Math.random() * 9000000)}`);
  };

  return (
    <div style={{padding:'32px',maxWidth:'700px',margin:'0 auto'}}>
      <div style={{background:'#fff',padding:'32px',borderRadius:'8px',boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)',borderTop:'4px solid #0d2a4e'}}>
        <h2 style={{fontSize:'24px',fontWeight:'bold',color:'#1e293b',marginBottom:'8px'}}>Client Profile Registration System (CPRS)</h2>
        <p style={{color:'#64748b',marginBottom:'24px',paddingBottom:'16px',borderBottom:'1px solid #e2e8f0'}}>Electronic Accreditation for e2m-Customs Transactions</p>

        {!ccn ? (
          <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:'bold',marginBottom:'4px'}}>Applicant Name</label>
                <input type="text" required style={{width:'100%',padding:'8px',border:'1px solid #cbd5e1',borderRadius:'4px'}} onChange={e => setFormData({...formData, applicant_name: e.target.value})} />
              </div>
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:'bold',marginBottom:'4px'}}>Company / Brokerage</label>
                <input type="text" required style={{width:'100%',padding:'8px',border:'1px solid #cbd5e1',borderRadius:'4px'}} onChange={e => setFormData({...formData, company_name: e.target.value})} />
              </div>
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:'bold',marginBottom:'4px'}}>TIN</label>
                <input type="text" required style={{width:'100%',padding:'8px',border:'1px solid #cbd5e1',borderRadius:'4px'}} onChange={e => setFormData({...formData, tin: e.target.value})} />
              </div>
              <div>
                <label style={{display:'block',fontSize:'14px',fontWeight:'bold',marginBottom:'4px'}}>Client Type</label>
                <select style={{width:'100%',padding:'8px',border:'1px solid #cbd5e1',borderRadius:'4px'}} onChange={e => setFormData({...formData, client_type: e.target.value})}>
                  <option>Importer</option><option>Customs Broker</option><option>Value Added Service Provider</option>
                </select>
              </div>
            </div>
            <button type="submit" style={{width:'100%',padding:'12px',background:'#0d2a4e',color:'#fff',fontWeight:'bold',borderRadius:'4px',border:'none',cursor:'pointer',marginTop:'8px'}}>Submit Application</button>
          </form>
        ) : (
          <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',padding:'24px',textAlign:'center',borderRadius:'4px'}}>
            <h3 style={{fontSize:'20px',fontWeight:'bold',color:'#166534',marginBottom:'8px'}}>Accreditation Approved</h3>
            <p style={{color:'#374151'}}>Your Lifetime Customs Client Number (CCN) is:</p>
            <div style={{fontSize:'28px',fontFamily:'monospace',fontWeight:'bold',margin:'16px 0',padding:'12px',background:'#fff',border:'2px dashed #9ca3af',display:'inline-block'}}>{ccn}</div>
            <p style={{fontSize:'12px',color:'#6b7280'}}>Keep this CCN. It is required for the Payment System (PMTS) and Assessment Lodgment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
