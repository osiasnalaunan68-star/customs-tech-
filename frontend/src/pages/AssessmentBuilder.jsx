import { useState, useEffect, useRef } from 'react'
import { calculateAssessment, formatPHP, formatUSD } from '../lib/ValuationEngine'

const EMPTY_FORM = {
  // Custom Branding
  companyName: 'Assessment Document Builder',
  subHeader: 'Professional Customs Brokerage Computation Tool',
  // Document Reference
  blNo: '', invoiceNo: '', containerNo: '', incoterms: 'CIF', brokerTin: '', prcLicense: '',
  // Parties
  importer: '', consignee: '', commodity: '', origin: '', port: 'Manila',
  // Valuation Inputs
  fob: '', freight: '0', insurance: '0', exchangeRate: '56', tariffRate: '0', exciseTaxAmt: '0', aep: '1500', brokerage: '0',
  // Digital Signature
  signatoryName: ''
}

export default function AssessmentBuilder({ sharedData }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [result, setResult] = useState(null)
  
  // Enterprise Audit Data (Auto-generated per load/save)
  const [auditData] = useState({
    assessmentId: `ASN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
    version: '1.0.4 (BOC CMTA Engine)',
    revision: 'Rev. 0 (Original)'
  })

  // Catch shared data from Entries page if any
  useEffect(() => {
    if (sharedData) {
      setForm(f => ({ ...f, ...sharedData }))
    }
  }, [sharedData])

  // Auto-calculate whenever valuation fields change
  useEffect(() => {
    try {
      const res = calculateAssessment({
        fob: form.fob,
        freight: form.freight,
        insurance: form.insurance,
        exchangeRate: form.exchangeRate || 56,
        tariffRate: form.tariffRate,
        aep: form.aep,
        brokerageFee: form.brokerage,
        isExcise: parseFloat(form.exciseTaxAmt) > 0 // Custom logic for builder
      })
      // Override excise tax breakdown with manual input if needed
      if (parseFloat(form.exciseTaxAmt) > 0) {
        res.breakdown.exciseTax = parseFloat(form.exciseTaxAmt);
        res.breakdown.vatBase = res.breakdown.dvPesos + res.breakdown.duty + res.breakdown.exciseTax + res.breakdown.ipf + res.breakdown.aep + res.breakdown.cds + res.breakdown.dst + res.breakdown.brokerageFee;
        res.breakdown.vat = res.isDeMinimis ? 0 : Math.round((res.breakdown.vatBase * 0.12) * 100) / 100;
        res.breakdown.grandTotal = res.breakdown.duty + res.breakdown.exciseTax + res.breakdown.vat + res.breakdown.ipf + res.breakdown.aep + res.breakdown.cds + res.breakdown.dst + res.breakdown.brokerageFee;
      }
      setResult(res)
    } catch (e) {
      setResult(null)
    }
  }, [form.fob, form.freight, form.insurance, form.exchangeRate, form.tariffRate, form.exciseTaxAmt, form.aep, form.brokerage])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  
  const handlePrint = () => {
    window.print()
  }

  const SEC = { fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', margin: '16px 0 8px' }
  const LABEL = { fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '4px', display: 'block' }

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
      
      {/* LEFT PANEL: DATA ENTRY WORKSPACE */}
      <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '16px' }} className="no-print">
        
        <div className="card">
          <div className="card-h"><span className="card-t">Custom Branding</span></div>
          <div className="fg"><label style={LABEL}>Company Name</label><input className="input" value={form.companyName} onChange={e=>set('companyName', e.target.value)}/></div>
          <div className="fg"><label style={LABEL}>Sub-Header</label><input className="input" value={form.subHeader} onChange={e=>set('subHeader', e.target.value)}/></div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">Document Reference</span></div>
          <div className="frow frow2">
            <div className="fg"><label style={LABEL}>B/L OR AWB NO.</label><input className="input" value={form.blNo} onChange={e=>set('blNo', e.target.value)}/></div>
            <div className="fg"><label style={LABEL}>INVOICE NO.</label><input className="input" value={form.invoiceNo} onChange={e=>set('invoiceNo', e.target.value)}/></div>
            <div className="fg"><label style={LABEL}>CONTAINER NO.</label><input className="input" value={form.containerNo} onChange={e=>set('containerNo', e.target.value)}/></div>
            <div className="fg"><label style={LABEL}>INCOTERMS</label><input className="input" value={form.incoterms} onChange={e=>set('incoterms', e.target.value)}/></div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">Parties & Commodity</span></div>
          <div className="fg"><label style={LABEL}>IMPORTER</label><input className="input" value={form.importer} onChange={e=>set('importer', e.target.value)}/></div>
          <div className="fg"><label style={LABEL}>COMMODITY</label><input className="input" value={form.commodity} onChange={e=>set('commodity', e.target.value)}/></div>
        </div>

        <div className="card">
          <div className="card-h"><span className="card-t">HS Code Search & Valuation</span></div>
          <div className="frow frow2">
            <div className="fg"><label style={LABEL}>CIF (USD) *</label><input className="input" type="number" value={form.fob} onChange={e=>set('fob', e.target.value)}/></div>
            <div className="fg"><label style={LABEL}>FREIGHT (USD)</label><input className="input" type="number" value={form.freight} onChange={e=>set('freight', e.target.value)}/></div>
            <div className="fg"><label style={LABEL}>EXCHANGE RATE</label><input className="input" type="number" value={form.exchangeRate} onChange={e=>set('exchangeRate', e.target.value)}/></div>
            <div className="fg"><label style={LABEL}>MFN DUTY RATE (%)</label><input className="input" type="number" value={form.tariffRate} onChange={e=>set('tariffRate', e.target.value)}/></div>
            <div className="fg"><label style={LABEL}>EXCISE TAX (₱)</label><input className="input" type="number" value={form.exciseTaxAmt} onChange={e=>set('exciseTaxAmt', e.target.value)}/></div>
            <div className="fg"><label style={LABEL}>AEP (₱)</label><input className="input" type="number" value={form.aep} onChange={e=>set('aep', e.target.value)}/></div>
          </div>
        </div>

        <button className="btn btn-primary" onClick={handlePrint}>🖨️ Print / Export PDF</button>
      </div>

      {/* RIGHT PANEL: PRINTABLE A4 DOCUMENT */}
      <div className="printable-a4" style={{ 
        flex: 1, background: '#fff', padding: '40px', color: '#000', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)', borderRadius: '4px', minHeight: '1122px' 
      }}>
        
        {/* Document Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '20px', textTransform: 'uppercase' }}>{form.companyName}</h2>
          <div style={{ fontSize: '12px', color: '#555' }}>{form.subHeader}</div>
          <h3 style={{ marginTop: '16px', fontSize: '16px', letterSpacing: '2px' }}>ASSESSMENT COMPUTATION WORKSHEET</h3>
        </div>

        {/* ENTERPRISE GOVERNANCE: Audit Metadata */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '16px', fontSize: '10px', fontFamily: 'monospace' }}>
          <div>
            <strong>Assessment No:</strong> {auditData.assessmentId}<br/>
            <strong>System Ver:</strong> {auditData.version}
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong>Generated:</strong> {auditData.timestamp}<br/>
            <strong>Revision:</strong> {auditData.revision}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '16px', fontWeight: 'bold' }}>
          <div>Date: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div>Incoterms: {form.incoterms || 'CIF'}</div>
          <div>Rate: ₱{form.exchangeRate}/USD</div>
          {result?.isDeMinimis && <div style={{ color: '#b45309' }}>⚠ DE MINIMIS EXEMPT</div>}
        </div>

        <div style={SEC}>I. Document Reference</div>
        <table className="print-table">
          <tbody>
            <tr><td className="lbl">B/L or AWB No.</td><td>{form.blNo || '—'}</td><td className="lbl">Invoice No.</td><td>{form.invoiceNo || '—'}</td></tr>
            <tr><td className="lbl">Container No.</td><td>{form.containerNo || '—'}</td><td className="lbl">Incoterms</td><td>{form.incoterms || '—'}</td></tr>
          </tbody>
        </table>

        <div style={SEC}>II. Parties & Commodity</div>
        <table className="print-table">
          <tbody>
            <tr><td className="lbl">Importer</td><td>{form.importer || '—'}</td><td className="lbl">Consignee</td><td>{form.consignee || '—'}</td></tr>
            <tr><td className="lbl">Commodity</td><td colSpan="3">{form.commodity || '—'}</td></tr>
          </tbody>
        </table>

        {result && (
          <>
            <div style={SEC}>III. Dutiable Value (CIF) — CMTA SEC. 700</div>
            <table className="print-table calc-table">
              <tbody>
                <tr><td>FOB (USD)</td><td className="val">{formatUSD(result.inputs.fobUsd)}</td></tr>
                <tr><td>+ Freight & Insurance</td><td className="val">{formatUSD(result.inputs.freightUsd + result.inputs.insuranceUsd)}</td></tr>
                <tr className="bold"><td>= CIF Value (USD)</td><td className="val">{formatUSD(result.inputs.cifUsd)}</td></tr>
                <tr><td>× Exchange Rate</td><td className="val">₱{result.inputs.exchangeRate}/USD</td></tr>
                <tr className="highlight"><td>ROUNDED DUTIABLE VALUE [Math.ceil]</td><td className="val">{formatPHP(result.breakdown.dvPesos)}</td></tr>
              </tbody>
            </table>

            {/* ENTERPRISE GOVERNANCE: Explicit De Minimis Note */}
            {result.isDeMinimis && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', color: '#854d0e', padding: '8px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold', margin: '8px 0' }}>
                ⚠ DE MINIMIS APPLIED — CMTA Sec. 423<br/>
                <span style={{ fontWeight: 'normal' }}>
                  Rounded DV: {formatPHP(result.breakdown.dvPesos)} | Threshold: ₱10,000.00 | Customs Duty: EXEMPT | VAT: EXEMPT
                </span>
              </div>
            )}

            <div style={SEC}>IV. Tax Computation — RA 10863 / TRAIN Law</div>
            <table className="print-table calc-table">
              <tbody>
                <tr><td colSpan="2" className="section-td">A. CUSTOMS DUTY</td></tr>
                <tr><td>Rounded DV × {result.inputs.tariffRate}% MFN Rate</td><td className="val">{result.isDeMinimis ? 'EXEMPT' : formatPHP(result.breakdown.duty)}</td></tr>
                
                <tr><td colSpan="2" className="section-td">B. EXCISE TAX (NIRC)</td></tr>
                <tr>
                  <td>
                    Excise Tax — As Declared
                    {/* ENTERPRISE GOVERNANCE: Excise Exception */}
                    {result.isDeMinimis && result.breakdown.exciseTax > 0 && <span style={{display: 'block', fontSize: '9px', color: '#dc2626'}}>*Not Covered By De Minimis Exemption</span>}
                  </td>
                  <td className="val">{formatPHP(result.breakdown.exciseTax)}</td>
                </tr>

                <tr><td colSpan="2" className="section-td">C. STATUTORY FEES (CMO 26-2003)</td></tr>
                <tr><td>IPF — Import Processing Fee</td><td className="val">{formatPHP(result.breakdown.ipf)}</td></tr>
                <tr><td>AEP — Arrastre + Examination</td><td className="val">{formatPHP(result.breakdown.aep)}</td></tr>
                <tr><td>CDS + DST — Fixed Stamps</td><td className="val">{formatPHP(result.breakdown.cds + result.breakdown.dst)}</td></tr>

                <tr><td colSpan="2" className="section-td">D. VALUE-ADDED TAX (TRAIN LAW)</td></tr>
                <tr><td>VAT Base (RDV + Duty + Excise + Fees)</td><td className="val">{formatPHP(result.breakdown.vatBase)}</td></tr>
                <tr><td>VAT = VAT Base × 12%</td><td className="val">{result.isDeMinimis ? 'EXEMPT' : formatPHP(result.breakdown.vat)}</td></tr>

                <tr className="grand-total"><td>TOTAL ASSESSMENT PAYABLE</td><td className="val">{formatPHP(result.breakdown.grandTotal)}</td></tr>
              </tbody>
            </table>

            {/* ENTERPRISE GOVERNANCE: Signature Blocks */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', pageBreakInside: 'avoid' }}>
              <div style={{ width: '30%', textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid black', height: '30px', marginBottom: '5px' }}></div>
                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>PREPARED BY</span><br/>
                <span style={{ fontSize: '9px', color: '#555' }}>Licensed Customs Broker</span>
              </div>
              <div style={{ width: '30%', textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid black', height: '30px', marginBottom: '5px' }}></div>
                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>CHECKED BY</span><br/>
                <span style={{ fontSize: '9px', color: '#555' }}>Supervising Tariff Specialist</span>
              </div>
              <div style={{ width: '30%', textAlign: 'center' }}>
                <div style={{ borderBottom: '1px solid black', height: '30px', marginBottom: '5px' }}></div>
                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>APPROVED BY</span><br/>
                <span style={{ fontSize: '9px', color: '#555' }}>Operations Manager</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Basic Print CSS directly injected */}
      <style dangerouslySetInnerHTML={{__html:`
        .print-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
        .print-table td { padding: 6px; border: 1px solid #e5e7eb; }
        .print-table .lbl { background: #f9fafb; font-weight: 600; width: 18%; color: #4b5563; }
        .calc-table td { border: none; border-bottom: 1px solid #f3f4f6; padding: 8px 4px; }
        .calc-table .val { text-align: right; font-weight: 500; }
        .calc-table .section-td { background: #f3f4f6; font-weight: 700; font-size: 10px; padding: 4px; border-top: 1px solid #d1d5db; border-bottom: 1px solid #d1d5db; }
        .calc-table .bold td { font-weight: 700; }
        .calc-table .highlight td { font-weight: 700; color: #1d4ed8; background: #eff6ff; border-top: 2px solid #bfdbfe; border-bottom: 2px solid #bfdbfe; }
        .calc-table .grand-total td { font-weight: 800; font-size: 14px; border-top: 2px solid #000; background: #000; color: #fff; padding: 12px 8px; }
        @media print {
          body { background: white; }
          .no-print, .nav, .header { display: none !important; }
          .printable-a4 { box-shadow: none !important; padding: 0 !important; width: 100% !important; }
        }
      `}} />
    </div>
  )
}
