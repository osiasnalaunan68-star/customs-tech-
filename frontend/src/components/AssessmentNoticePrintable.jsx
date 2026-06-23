import React, { useState } from 'react';

// Helper function to safely format Philippine Peso
const formatPHP = (amount) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

// Defensive guard for exchange rate
const safeRate = (rate) => (Number(rate) || 0).toFixed(4);

export default function AssessmentNoticePrintable({ data }) {
  const [dofLogo, setDofLogo] = useState(null);
  const [bocLogo, setBocLogo] = useState(null);

  // Function to handle the gallery pop-up and set image
  const handleImageUpload = (e, setLogo) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setLogo(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Defensive guard: Prevent crash if API data is still loading
  if (!data) {
    return <div className="p-10 text-center text-gray-500">Loading Assessment Notice data...</div>;
  }

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto text-sm text-black print-container font-serif">
      
      {/* CSS For Printing Injected Directly for Convenience */}
      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          body { background-color: white !important; }
          .no-print { display: none !important; }
          .panel-break-avoid { page-break-inside: avoid; break-inside: avoid; }
          thead { display: table-header-group; }
          .print-container * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* HEADER WITH INTERACTIVE LOGOS (Empty Plate Feature) */}
      <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
        
        {/* Left Logo (DOF) */}
        <label className="w-24 h-24 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden group">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setDofLogo)} />
          {dofLogo ? (
            <img src={dofLogo} alt="DOF Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-gray-500 group-hover:text-black text-center p-2 no-print">Click to add DOF Logo</span>
          )}
        </label>

        {/* Center Text */}
        <div className="text-center">
          <p className="text-sm">REPUBLIC OF THE PHILIPPINES</p>
          <p className="text-sm">DEPARTMENT OF FINANCE</p>
          <h1 className="text-xl font-bold uppercase mt-1">Bureau of Customs</h1>
          <p className="text-sm uppercase tracking-wide">Port of {data.port_code || "N/A"}</p>
        </div>

        {/* Right Logo (BOC) */}
        <label className="w-24 h-24 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center cursor-pointer overflow-hidden group">
          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setBocLogo)} />
          {bocLogo ? (
            <img src={bocLogo} alt="BOC Logo" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-gray-500 group-hover:text-black text-center p-2 no-print">Click to add BOC Logo</span>
          )}
        </label>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-lg font-bold tracking-wider">ASSESSMENT NOTICE</h2>
        <p className="text-xs text-gray-600 font-mono">e2m 1-Assessment System Document</p>
      </div>

      {/* PANEL A: Shipment Metadata */}
      <div className="mb-6 panel-break-avoid">
        <h3 className="font-bold bg-gray-200 p-2 mb-2 uppercase border border-black text-xs">
          Panel A: Declaration Details
        </h3>
        <div className="grid grid-cols-2 gap-4 border border-black p-4 font-mono text-xs relative">
          {/* Dummy QR Placeholder */}
          <div className="absolute top-2 right-2 w-16 h-16 border border-black flex items-center justify-center text-[8px] text-center bg-gray-100">
            QR CODE
          </div>
          <div>
            <p><strong>VASP Ref No:</strong> {data.vasp_reference_no}</p>
            <p><strong>SAD Reg No:</strong> {data.sad_registration_no}</p>
            <p><strong>TIN:</strong> {data.tin}</p>
          </div>
          <div>
            <p><strong>Assessment Date:</strong> {data.assessment_date ?? 'N/A'}</p>
            <p><strong>Exchange Rate:</strong> ₱{safeRate(data.bsp_exchange_rate)}</p>
          </div>
        </div>
      </div>

      {/* PANEL B: Duty & Taxes */}
      <div className="mb-6 panel-break-avoid">
        <h3 className="font-bold bg-gray-200 p-2 mb-2 uppercase border border-black text-xs">
          Panel B: Internal Revenue Tax Computations
        </h3>
        <table className="w-full border-collapse border border-black text-sm">
          <tbody>
            <tr>
              <td className="border border-black p-2 font-semibold w-2/3">Dutiable Value (DV)</td>
              <td className="border border-black p-2 text-right font-mono">{formatPHP(data.dutiable_value_php)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Customs Duty ({(data.tariff_rate_pct * 100).toFixed(2)}%)</td>
              <td className="border border-black p-2 text-right font-mono">{formatPHP(data.customs_duty_php)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Excise Tax</td>
              <td className="border border-black p-2 text-right font-mono">{formatPHP(data.excise_tax)}</td>
            </tr>
            <tr className="bg-gray-100">
              <td className="border border-black p-2 font-semibold">VAT Base (Landed Cost)</td>
              <td className="border border-black p-2 text-right font-mono">{formatPHP(data.vat_base_php)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold text-red-700">VAT Amount (12%)</td>
              <td className="border border-black p-2 text-right font-bold font-mono text-red-700">{formatPHP(data.vat_amount_php)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PANEL C: Customs Fees */}
      <div className="mb-8 panel-break-avoid">
        <h3 className="font-bold bg-gray-200 p-2 mb-2 uppercase border border-black text-xs">
          Panel C: Customs Fees & Third-Party Charges
        </h3>
        <table className="w-full border-collapse border border-black text-sm">
          <tbody>
            <tr>
              <td className="border border-black p-2 w-2/3">Import Processing Fee (IPF)</td>
              <td className="border border-black p-2 text-right font-mono">{formatPHP(data.ipf)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Customs Doc Stamp (CDS)</td>
              <td className="border border-black p-2 text-right font-mono">{formatPHP(data.cds)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Arrastre</td>
              <td className="border border-black p-2 text-right font-mono">{formatPHP(data.arrastre)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">Wharfage</td>
              <td className="border border-black p-2 text-right font-mono">{formatPHP(data.wharfage)}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 text-gray-600 italic">Brokerage Fees (Not Payable to BOC)</td>
              <td className="border border-black p-2 text-right font-mono text-gray-600">{formatPHP(data.brokerage_fee)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* TOTAL PAYABLE */}
      <div className="flex justify-end mb-12 panel-break-avoid">
        <div className="border-4 border-black p-4 w-1/2">
          <p className="text-sm font-bold uppercase">Total Amount Payable</p>
          <p className="text-3xl font-bold font-mono text-right">{formatPHP(data.total_amount_payable)}</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="border-t border-black pt-4 text-center panel-break-avoid">
        <p className="text-xs font-mono uppercase">
          This is a computer-generated Assessment Notice from the e2m 1-Assessment System. No signature required.
        </p>
        <p className="text-[10px] mt-1">Generated on: {new Date().toLocaleString()}</p>
      </div>

    </div>
  );
}
