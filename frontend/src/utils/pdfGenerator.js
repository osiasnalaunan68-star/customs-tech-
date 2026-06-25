import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const fmtN   = n => (n||0).toLocaleString('en-PH',{minimumFractionDigits:2})
const fmtUSD = n => `USD ${fmtN(n)}`
const fmtPHP = n => `₱${fmtN(n)}`

function secHdr(doc, title, y, W) {
  doc.setFillColor(225,225,225); doc.rect(14, y, W-28, 6, 'F')
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(50,50,50)
  doc.text(title, 16, y+4); doc.setFont('helvetica','normal'); doc.setTextColor(0)
  return y + 8
}
function tbl2(doc, rows, y) {
  autoTable(doc, {
    startY: y, margin:{left:14,right:14},
    styles:{fontSize:8,cellPadding:1.8},
    body: rows,
    columnStyles:{0:{cellWidth:82,fontStyle:'bold'},1:{halign:'right'}},
    theme:'grid',
  }); return doc.lastAutoTable.finalY
}
function tbl4(doc, rows, y) {
  autoTable(doc, {
    startY: y, margin:{left:14,right:14},
    styles:{fontSize:8,cellPadding:1.8},
    body: rows,
    columnStyles:{0:{cellWidth:38,fontStyle:'bold'},2:{cellWidth:38,fontStyle:'bold'}},
    theme:'grid',
  }); return doc.lastAutoTable.finalY
}

export function generateAssessmentPDF(a) {
  const inp = a.inputs  || {}
  const out = a.outputs || {}
  const today = new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})
  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'})
  const W = doc.internal.pageSize.getWidth()
  let y = 12

  doc.setFontSize(9); doc.setFont('helvetica','normal')
  doc.text(a.company_name||'Customs Brokerage Platform', W/2, y, {align:'center'}); y+=5
  doc.setFontSize(12); doc.setFont('helvetica','bold')
  doc.text('IMPORT ENTRY ASSESSMENT WORKSHEET', W/2, y, {align:'center'}); y+=5
  doc.setFontSize(7.5); doc.setFont('helvetica','normal')
  doc.text('CMTA RA 10863 / TRAIN Law RA 10963 — Computational Worksheet', W/2, y, {align:'center'}); y+=3
  doc.setDrawColor(0); doc.setLineWidth(0.4); doc.line(14,y,W-14,y); y+=4

  doc.setFontSize(7.5)
  doc.text(
    [`ACN: ${a.acn||'DRAFT'}`, `Date: ${today}`, `Status: ${(a.status||'draft').toUpperCase()}`,
     `Incoterms: ${a.incoterms||'—'}`, `Engine: v${a.engine_version||'1.0.0'}`].join('   |   '),
    W/2, y, {align:'center'}); y+=5

  if (a.is_de_minimis) {
    doc.setFillColor(255,249,195); doc.rect(14,y-1.5,W-28,7,'F')
    doc.setFont('helvetica','bold'); doc.setFontSize(8)
    doc.text('⚠  DE MINIMIS EXEMPT — CMTA Sec.423 (DV ≤ ₱10,000): Duty and VAT = ₱0.00', W/2, y+3, {align:'center'})
    doc.setFont('helvetica','normal'); y+=9
  }

  y = secHdr(doc,'I.  DOCUMENT REFERENCE',y,W)
  y = tbl4(doc,[
    ['B/L or AWB No.', a.bl_number    ||'—', 'Invoice No.',     a.invoice_no    ||'—'],
    ['Container No.',  a.container_no ||'—', 'Incoterms',       a.incoterms     ||'—'],
    ['Broker TIN',     a.broker_tin   ||'—', 'PRC License No.', a.prc_license_no||'—'],
  ],y)+4

  y = secHdr(doc,'II.  PARTIES & COMMODITY',y,W)
  y = tbl4(doc,[
    ['Importer',         a.importer       ||'—', 'Consignee',     a.consignee      ||'—'],
    ['Commodity',        {content:a.commodity||'—',colSpan:3}],
    ['Country of Origin',a.origin_country ||'—', 'Port of Entry', a.port_of_entry  ||'—'],
    ['AHTN Code (2022)', a.ahtn_code      ||'—', 'Tariff Rate',   `${inp.tariffRate||0}%`],
  ],y)+4

  y = secHdr(doc,'III.  DUTIABLE VALUE — CIF Computation  [Math.ceil — CMTA Sec. 700]',y,W)
  y = tbl2(doc,[
    ['FOB Value',           fmtUSD(inp.fobUsd)],
    ['+ Freight Charges',   fmtUSD(inp.freightUsd)],
    ['+ Insurance',         fmtUSD(inp.insuranceUsd)],
    ['= CIF Value (USD)',   fmtUSD(inp.cifUsd)],
    ['× Exchange Rate',     `₱${inp.exchangeRate||0}/USD`],
    ['CIF Value PHP (Raw)', fmtPHP(out.cifPhpRaw)],
  ],y)
  autoTable(doc,{
    startY:y, margin:{left:14,right:14},
    styles:{fontSize:9,cellPadding:2.2,fontStyle:'bold'},
    body:[['ROUNDED DUTIABLE VALUE  [Math.ceil]', fmtPHP(out.dvPesos)]],
    columnStyles:{
      0:{cellWidth:82,fillColor:[239,246,255],textColor:[30,64,175]},
      1:{halign:'right',fillColor:[239,246,255],textColor:[30,64,175]},
    }, theme:'grid',
  }); y = doc.lastAutoTable.finalY+4
  const exempt = a.is_de_minimis
  y = secHdr(doc,'IV.  TAX COMPUTATION — RA 10863 / TRAIN Law (RA 10963)',y,W)
  autoTable(doc,{
    startY:y, margin:{left:14,right:14},
    styles:{fontSize:8,cellPadding:1.8},
    body:[
      [{content:'A. CUSTOMS DUTY',colSpan:2,styles:{fontStyle:'bold',fillColor:[245,245,245]}}],
      [`Rounded DV × ${inp.tariffRate||0}% MFN Tariff Rate (AHTN 2022)`, exempt?'EXEMPT':fmtPHP(out.duty)],
      [{content:'B. EXCISE TAX (NIRC)',colSpan:2,styles:{fontStyle:'bold',fillColor:[245,245,245]}}],
      ['Excise Tax — As Declared', fmtPHP(out.exciseTax)],
      [{content:'C. STATUTORY FEES (CMO 26-2002)',colSpan:2,styles:{fontStyle:'bold',fillColor:[245,245,245]}}],
      [`IPF — Import Processing Fee (DV: ${fmtPHP(out.dvPesos)})`, fmtPHP(out.ipf)],
      ['AEP — Arrastre + Examination + Wharfage',                   fmtPHP(out.aep)],
      ['CDS — Customs Documentary Stamp (Fixed)',                    fmtPHP(out.cds)],
      ['DST — BIR Documentary Stamp Tax (Fixed)',                    fmtPHP(out.dst)],
      ['Brokerage / Professional Fee',                               fmtPHP(out.brokerageFee)],
      [{content:'D. VALUE-ADDED TAX — TRAIN LAW (RA 10963)',colSpan:2,styles:{fontStyle:'bold',fillColor:[245,245,245]}}],
      ['VAT Base = RDV + Duty + Excise + IPF + AEP + CDS + DST + Brokerage', fmtPHP(out.vatBase)],
      ['VAT = VAT Base × 12%', exempt?'EXEMPT':fmtPHP(out.vat)],
    ],
    columnStyles:{0:{cellWidth:120},1:{halign:'right',fontStyle:'bold'}},
    theme:'grid',
  }); y = doc.lastAutoTable.finalY
  autoTable(doc,{
    startY:y, margin:{left:14,right:14},
    styles:{fontSize:10.5,cellPadding:2.5,fontStyle:'bold'},
    body:[['TOTAL TAXES AND CHARGES PAYABLE (PHP)', fmtPHP(out.grandTotal)]],
    columnStyles:{
      0:{cellWidth:120,fillColor:[17,17,17],textColor:[255,255,255]},
      1:{halign:'right',fillColor:[17,17,17],textColor:[255,255,255]},
    }, theme:'grid',
  }); y = doc.lastAutoTable.finalY+5

  const dv=out.dvPesos||0
  const bi=dv<=250000?0:dv<=500000?1:dv<=750000?2:3
  doc.setFontSize(7); doc.setFont('helvetica','bold')
  doc.text('IPF Schedule Ref (CMO 26-2002):',14,y); y+=3
  ;[['≤₱250k','₱250'],['₱250k–₱500k','₱500'],['₱500k–₱750k','₱750'],['>₱750k','₱1,000']].forEach(([r,v],i)=>{
    doc.setFont('helvetica', i===bi?'bold':'normal')
    doc.text(`${r}→${v}${i===bi?' ◄':''}`, 14+i*45, y)
  }); y+=7

  y = secHdr(doc,'V.  CERTIFICATION & SIGNATURES',y,W)
  autoTable(doc,{
    startY:y, margin:{left:14,right:14},
    styles:{fontSize:7.5,cellPadding:2,halign:'center'},
    body:[
      [{content:'\n\n\n',styles:{minCellHeight:14}},{content:'\n\n\n',styles:{minCellHeight:14}},{content:'\n\n\n',styles:{minCellHeight:14}}],
      [
        {content:a.declarant_name||'________________________',styles:{fontStyle:'bold'}},
        {content:'________________________',styles:{fontStyle:'bold'}},
        {content:a.approved_by_name||a.approved_by||'________________________',styles:{fontStyle:'bold'}},
      ],
      ['Customs Broker / Declarant','Checker / Reviewer','Approver / Authorized Officer'],
      [`PRC: ${a.prc_license_no||'—'}`, '', a.approved_at?`Approved: ${new Date(a.approved_at).toLocaleDateString('en-PH')}`:''],
    ],
    theme:'grid',
  }); y = doc.lastAutoTable.finalY+5

  doc.setFontSize(6.5); doc.setFont('helvetica','normal'); doc.setTextColor(128)
  doc.text(
    `${a.company_name||'Customs Tech by Osias.org'} — Generated: ${today} | ` +
    'Computational worksheet only. Subject to official regulatory review.',
    W/2, y, {align:'center'}
  )
  const filename = `${a.acn||'DRAFT'}_Assessment_${today.replace(/,?\s+/g,'-')}.pdf`
  doc.save(filename)
  return filename
}
