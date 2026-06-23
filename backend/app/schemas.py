from pydantic import BaseModel, computed_field
from datetime import date
from typing import Optional

class AssessmentNoticeSchema(BaseModel):
    # 1. DOCUMENT IDENTITY METADATA
    vasp_reference_no: str
    sad_registration_no: str
    port_code: str
    assessment_date: date
    tin: str

    # 2. RAW VALUES (IN USD OR FOREIGN CURRENCY)
    fob: float
    freight: float
    insurance: float
    bsp_exchange_rate: float
    
    # 3. RATES & FEES
    tariff_rate_pct: float  # e.g., 0.15 for 15%
    excise_tax: float = 0.0
    ipf: float = 1000.00    # Import Processing Fee
    arrastre: float = 0.0
    wharfage: float = 0.0
    brokerage_fee: float = 0.0
    cds: float = 30.00      # Customs Documentary Stamp (Fixed)

    # 4. COMPLIANCE FORMULAS (PHILIPPINE TAX LAW)
    @computed_field
    @property
    def dutiable_value_php(self) -> float:
        """DV = (FOB + Freight + Insurance) * BSP Exchange Rate"""
        total_foreign = self.fob + self.freight + self.insurance
        return round(total_foreign * self.bsp_exchange_rate, 2)

    @computed_field
    @property
    def customs_duty_php(self) -> float:
        """CUSTOMS DUTY = DV * Tariff Rate percentage"""
        return round(self.dutiable_value_php * self.tariff_rate_pct, 2)

    @computed_field
    @property
    def vat_base_php(self) -> float:
        """VAT BASE (Landed Cost) = DV + Duty + Excise + Misc Fees"""
        return round(
            self.dutiable_value_php + 
            self.customs_duty_php + 
            self.excise_tax + 
            self.ipf + 
            self.arrastre + 
            self.wharfage + 
            self.brokerage_fee + 
            self.cds, 2
        )

    @computed_field
    @property
    def vat_amount_php(self) -> float:
        """VAT AMOUNT = VAT Base * 12%"""
        return round(self.vat_base_php * 0.12, 2)

    @computed_field
    @property
    def total_amount_payable(self) -> float:
        """Total Payable to BOC. No double counting."""
        return round(
            self.customs_duty_php + 
            self.vat_amount_php + 
            self.excise_tax + 
            self.ipf + 
            self.arrastre + 
            self.wharfage + 
            self.cds, 2
        )
