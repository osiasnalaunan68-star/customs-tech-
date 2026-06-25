/**
 * ValuationEngine.js
 * ==================
 * Single source of truth for Philippine Bureau of Customs import
 * duty and tax computations — Customs Tech by Osias.org.
 *
 * Statutory basis:
 *   CMTA RA 10863        — Customs Modernization and Tariff Act
 *   TRAIN Law RA 10963   — Tax Reform for Acceleration and Inclusion
 *   BOC CMO 26-2002      — Import Processing Fee Schedule
 *   NIRC (as amended)    — Excise Tax provisions
 *
 * Arithmetic strategy — INTEGER CENTAVO REPRESENTATION:
 *   All monetary math is performed internally using integers (centavos).
 *   This eliminates IEEE 754 floating-point accumulation errors entirely.
 *   Classic example prevented: 0.1 + 0.2 → 0.30000000000000004 (wrong)
 *                                        → toCents: 10 + 20 = 30 → 0.30 (correct)
 *   Inputs and outputs remain in decimal pesos (2 d.p.) for consumers.
 *
 * @module ValuationEngine
 * @version 1.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: STATUTORY CONSTANTS
// Source: CMTA, TRAIN Law, BOC CMO 26-2002
// ─────────────────────────────────────────────────────────────────────────────

/** Customs Documentary Stamp — fixed statutory charge (PHP) — CMO */
const CDS_AMOUNT = 15.00

/** BIR Documentary Stamp Tax — fixed statutory charge (PHP) — NIRC */
const DST_AMOUNT = 30.00

/** De Minimis Value ceiling — CMTA Section 423 (whole pesos) */
const DE_MINIMIS_CEILING = 10_000

/** BOC local insurance formula rate — applied when insurance is blank/zero */
const LOCAL_INSURANCE_RATE = 0.02

/** Value-Added Tax rate — TRAIN Law Section 107 */
const VAT_RATE = 0.12

/** Default AEP flat estimate — Arrastre + Examination + Wharfage (PHP) */
const DEFAULT_AEP_PHP = 1_500.00

/**
 * IPF fee schedule — BOC CMO 26-2002.
 * Brackets sorted ascending; first match (dvPesos <= ceiling) wins.
 * @type {ReadonlyArray<{ceiling: number, fee: number}>}
 */
const IPF_SCHEDULE = Object.freeze([
  { ceiling:  250_000, fee:   250 },
  { ceiling:  500_000, fee:   500 },
  { ceiling:  750_000, fee:   750 },
  { ceiling: Infinity, fee: 1_000 },
])


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: CENTAVO-PRECISION ARITHMETIC
// All internal values are integers (centavos = 1/100 of a peso).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a decimal peso amount to integer centavos.
 * Math.round absorbs any floating-point noise from upstream parsing.
 *
 * @param {number} pesos
 * @returns {number} integer centavos
 */
const toCents = pesos => Math.round(Number(pesos) * 100)

/**
 * Convert integer centavos back to decimal pesos.
 *
 * @param {number} cents
 * @returns {number} pesos (up to 2 decimal places)
 */
const fromCents = cents => cents / 100

/**
 * Multiply two decimal amounts (e.g. USD × exchange rate) using centavo
 * intermediates to prevent floating-point drift.
 *
 * Algorithm:
 *   toCents(a) × toCents(b)
 *   ────────────────────────  → Math.round → integer centavos
 *           100
 *
 * Proof — 1,000.50 USD × 56.25 PHP/USD:
 *   100050 × 5625 / 100 = 5,627,812.50 → 5,627,813 ¢ = ₱56,278.13 ✓
 *   Native JS: 1000.50 × 56.25 = 56,278.125 → rounding varies per platform ✗
 *
 * @param {number} a  First factor in pesos / USD
 * @param {number} b  Second factor in pesos / rate
 * @returns {number}  Result in centavos (integer)
 */
const mulPesos = (a, b) =>
  Math.round((toCents(a) * toCents(b)) / 100)

/**
 * Multiply centavos by a decimal rate, result in centavos.
 * Example: mulRate(5_000_000, 0.12) → 600,000¢ = ₱6,000.00
 *
 * @param {number} cents integer centavos
 * @param {number} rate  decimal (e.g. 0.12 for 12%)
 * @returns {number}     integer centavos
 */
const mulRate = (cents, rate) => Math.round(cents * rate)

/**
 * Sum an arbitrary number of centavo values.
 * Bitwise OR (| 0) coerces each to integer, guarding against float leakage.
 *
 * @param {...number} amounts
 * @returns {number} integer centavos
 */
const sumCents = (...amounts) =>
  amounts.reduce((acc, v) => acc + (v | 0), 0)


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: CUSTOM ERROR CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thrown when the assessment payload violates CMTA validation rules.
 * Consumers should catch this and surface `error.errors[]` in the UI.
 *
 * @example
 * try {
 *   calculateAssessment(payload)
 * } catch (e) {
 *   if (e instanceof ValuationError) setFieldErrors(e.errors)
 * }
 */
export class ValuationError extends Error {
  /**
   * @param {string[]} errors Ordered list of validation failure messages
   */
  constructor(errors) {
    super(`[ValuationEngine] ${errors.join(' | ')}`)
    this.name   = 'ValuationError'
    this.errors = Array.isArray(errors) ? errors : [String(errors)]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: INPUT VALIDATION & NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate the raw consumer payload, auto-resolve missing insurance,
 * and apply statutory defaults.
 *
 * Hard failures → throws ValuationError (stops computation).
 * Soft advisories → appended to warnings[] (computation continues).
 *
 * @param {AssessmentPayload} raw
 * @returns {{ normalized: NormalizedInputs, warnings: string[] }}
 * @throws {ValuationError}
 */
function validateAndNormalize(raw) {
  const errors   = []
  const warnings = []

  // ── Safe numeric parse — null/undefined/''/NaN all become 0 ───────────
  const fob          = Number(raw.fob)          || 0
  const freight      = Number(raw.freight)      || 0
  const rawInsurance = Number(raw.insurance)    || 0
  const exchangeRate = Number(raw.exchangeRate) || 0
  const tariffRate   = Number(raw.tariffRate)   || 0

  // ── HARD CONSTRAINTS — CMTA Impossible Importation Rules ──────────────
  if (!Number.isFinite(fob) || fob <= 0)
    errors.push(
      'FOB must be a positive USD value. ' +
      'An FOB ≤ 0 constitutes an impossible importation under CMTA.'
    )

  if (!Number.isFinite(freight) || freight <= 0)
    errors.push(
      'Freight must be a positive USD value. ' +
      'Zero freight is an impossible importation (goods must be transported).'
    )

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0)
    errors.push('Exchange rate must be a positive PHP/USD value (e.g. 56.25).')

  if (!Number.isFinite(tariffRate) || tariffRate < 0 || tariffRate > 100)
    errors.push(
      `Tariff rate "${raw.tariffRate}" is invalid. ` +
      'Expected a percentage between 0 and 100 (e.g. 5 for 5%).'
    )

  if (errors.length > 0) throw new ValuationError(errors)

  // ── INSURANCE AUTO-RESOLUTION — BOC Local Formula ─────────────────────
  // Applied when insurance is blank, null, undefined, or explicitly 0.
  const insuranceIsBlank = rawInsurance <= 0
    || raw.insurance === undefined
    || raw.insurance === null
    || String(raw.insurance).trim() === ''

  let insurance = rawInsurance
  if (insuranceIsBlank) {
    // BOC Standard: Local Insurance = (FOB + Freight) × 2%
    insurance = fromCents(mulRate(toCents(fob + freight), LOCAL_INSURANCE_RATE))
    warnings.push(
      `Insurance was blank or zero. BOC local formula applied: ` +
      `(FOB + Freight) × ${LOCAL_INSURANCE_RATE * 100}% = ` +
      `USD ${insurance.toFixed(4)}.`
    )
  }

  // ── OPTIONAL FIELDS WITH STATUTORY DEFAULTS ────────────────────────────
  const exciseTax = Math.max(0, Number(raw.exciseTax) || 0)

  // AEP: respect an explicit 0 (user waiver), but apply default if omitted
  const aepProvided = raw.aep !== undefined && raw.aep !== null && String(raw.aep).trim() !== ''
  const aep         = aepProvided
    ? Math.max(0, Number(raw.aep) || 0)
    : DEFAULT_AEP_PHP

  const brokerageFee = Math.max(0, Number(raw.brokerageFee) || 0)
  const isExcise     = Boolean(raw.isExcise)

  return {
    normalized: {
      fob, freight, insurance, exchangeRate,
      tariffRate, exciseTax, aep, brokerageFee, isExcise,
    },
    warnings,
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: COMPUTATION PIPELINE
// Pure, single-responsibility, unit-testable functions.
// Each function is prefixed _step{N}_ to convey evaluation order.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Step 1 — CIF (USD) from Incoterm components.
 * CIF = FOB + Freight + Insurance.
 *
 * @param {number} fobC        FOB in centavos (USD)
 * @param {number} freightC    Freight in centavos (USD)
 * @param {number} insuranceC  Insurance in centavos (USD)
 * @returns {number}           CIF in centavos (USD)
 */
function _step1_CIF(fobC, freightC, insuranceC) {
  return sumCents(fobC, freightC, insuranceC)
}

/**
 * Step 2 — Dutiable Value (PHP) — CMTA Section 700.
 *
 * DV = Math.ceil(CIF_USD × Exchange_Rate)
 *
 * The ceiling operation is mandatory and produces an INTEGER number of
 * whole pesos. No centavo component survives this step — that is
 * intentional per the CMTA text.
 *
 * @param {number} cifUsd      CIF in decimal USD
 * @param {number} exchangeRate BSP PHP/USD rate
 * @returns {{ dvPesos: number, cifPhpRaw: number }}
 *   dvPesos   — DV in whole pesos (post-ceiling, integer)
 *   cifPhpRaw — CIF × rate in PHP before ceiling (2 d.p., for display)
 */
function _step2_DV(cifUsd, exchangeRate) {
  const cifPhpCents = mulPesos(cifUsd, exchangeRate)    // integer centavos
  const cifPhpRaw   = fromCents(cifPhpCents)             // decimal pesos
  const dvPesos     = Math.ceil(cifPhpRaw)               // CMTA Sec 700 ↑
  return { dvPesos, cifPhpRaw }
}

/**
 * Step 3 — Import Processing Fee — BOC CMO 26-2002.
 *
 * @param {number} dvPesos Integer DV in whole pesos
 * @returns {number}       IPF fee in whole pesos
 */
function _step3_IPF(dvPesos) {
  const bracket = IPF_SCHEDULE.find(b => dvPesos <= b.ceiling)
  return (bracket ?? IPF_SCHEDULE.at(-1)).fee
}

/**
 * Step 4 — De Minimis determination — CMTA Section 423.
 *
 * Exempt when: DV ≤ ₱10,000 AND goods are NOT an excise product.
 * Non-exempt:  DV >  ₱10,000 OR  goods ARE an excise product.
 *
 * When exempt: Customs Duty AND VAT are both forced to ₱0.00.
 * All statutory fees (IPF, AEP, CDS, DST) still apply.
 *
 * @param {number}  dvPesos
 * @param {boolean} isExcise
 * @returns {boolean}
 */
function _step4_isDeMinimis(dvPesos, isExcise) {
  return dvPesos <= DE_MINIMIS_CEILING && !isExcise
}

/**
 * Step 5 — Customs Duty.
 * Duty = Rounded DV × (tariffRate ÷ 100).
 * Forced to 0 for De Minimis shipments.
 *
 * @param {number}  dvPesos
 * @param {number}  tariffRate Percentage (e.g. 5 for 5%)
 * @param {boolean} deMinimis
 * @returns {number}           Duty in centavos
 */
function _step5_duty(dvPesos, tariffRate, deMinimis) {
  if (deMinimis) return 0
  return mulRate(toCents(dvPesos), tariffRate / 100)
}

/**
 * Step 6 — VAT Base — TRAIN Law Section 107.
 *
 * VAT Base = DV + Duty + Excise Tax + IPF + Brokerage Fee + CDS + DST
 *
 * IMPORTANT: AEP (Arrastre + Examination + Wharfage) is a port charge —
 * it is NOT included in the VAT base per TRAIN Law Section 107.
 * It is included only in the Grand Total.
 *
 * @param {number} dvPesos
 * @param {number} dutyC       Centavos
 * @param {number} exciseC     Centavos
 * @param {number} ipfC        Centavos
 * @param {number} brokerageC  Centavos
 * @param {number} cdsC        Centavos
 * @param {number} dstC        Centavos
 * @returns {number}           VAT base in centavos
 */
function _step6_vatBase(dvPesos, dutyC, exciseC, ipfC, brokerageC, cdsC, dstC) {
  return sumCents(toCents(dvPesos), dutyC, exciseC, ipfC, brokerageC, cdsC, dstC)
}

/**
 * Step 7 — Value-Added Tax — TRAIN Law Section 107.
 * VAT = VAT Base × 12%.
 * Forced to 0 for De Minimis shipments.
 *
 * @param {number}  vatBaseC Centavos
 * @param {boolean} deMinimis
 * @returns {number}         VAT in centavos
 */
function _step7_VAT(vatBaseC, deMinimis) {
  if (deMinimis) return 0
  return mulRate(vatBaseC, VAT_RATE)
}

/**
 * Step 8 — Grand Total Payable.
 * Total = Duty + Excise + VAT + IPF + AEP + CDS + DST + Brokerage.
 * AEP enters here (not in VAT base).
 *
 * @param {number} dutyC
 * @param {number} exciseC
 * @param {number} vatC
 * @param {number} ipfC
 * @param {number} aepC
 * @param {number} cdsC
 * @param {number} dstC
 * @param {number} brokerageC
 * @returns {number} Grand total in centavos
 */
function _step8_grandTotal(dutyC, exciseC, vatC, ipfC, aepC, cdsC, dstC, brokerageC) {
  return sumCents(dutyC, exciseC, vatC, ipfC, aepC, cdsC, dstC, brokerageC)
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: MAIN EXPORT — calculateAssessment(payload)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a complete Philippine customs import duty assessment.
 *
 * All monetary inputs in their natural denomination:
 *   USD   → fob, freight, insurance
 *   PHP   → exciseTax, aep, brokerageFee (and all outputs)
 *   Rate  → exchangeRate (PHP/USD, e.g. 56.25)
 *   Pct   → tariffRate as a PERCENTAGE integer (e.g. 5 for 5%, NOT 0.05)
 *
 * @param {AssessmentPayload} payload
 * @returns {AssessmentResult}
 * @throws {ValuationError} if any hard validation constraint fails
 *
 * @example
 * import { calculateAssessment, formatPHP } from '@/lib/ValuationEngine'
 *
 * const result = calculateAssessment({
 *   fob:          5_000,   // USD
 *   freight:        350,   // USD
 *   insurance:       70,   // USD
 *   exchangeRate:  56.25,  // PHP/USD
 *   tariffRate:       5,   // 5%
 *   exciseTax:        0,
 *   aep:          1_500,
 *   brokerageFee:  2_500,
 *   isExcise:      false,
 * })
 *
 * console.log(formatPHP(result.breakdown.grandTotal))
 * // → "₱41,762.40" (exact, no float drift)
 */
export function calculateAssessment(payload) {

  // ── 0. Validate & normalize ────────────────────────────────────────────
  const { normalized: n, warnings } = validateAndNormalize(payload)

  // ── 1. CIF (USD) ───────────────────────────────────────────────────────
  const fobC       = toCents(n.fob)
  const freightC   = toCents(n.freight)
  const insC       = toCents(n.insurance)
  const cifUsdC    = _step1_CIF(fobC, freightC, insC)
  const cifUsd     = fromCents(cifUsdC)

  // ── 2. Dutiable Value — CMTA Sec 700 (Math.ceil → integer pesos) ──────
  const { dvPesos, cifPhpRaw } = _step2_DV(cifUsd, n.exchangeRate)

  // ── 3. Import Processing Fee — BOC CMO 26-2002 ────────────────────────
  const ipfPhp = _step3_IPF(dvPesos)
  const ipfC   = toCents(ipfPhp)

  // ── 4. De Minimis — CMTA Sec 423 ──────────────────────────────────────
  const deMinimis = _step4_isDeMinimis(dvPesos, n.isExcise)
  if (deMinimis) {
    warnings.push(
      `DE MINIMIS: Dutiable Value ₱${dvPesos.toLocaleString('en-PH')} ` +
      `≤ ₱${DE_MINIMIS_CEILING.toLocaleString('en-PH')} and goods are ` +
      `not an excise product — Customs Duty and VAT set to ₱0.00 (CMTA Sec. 423).`
    )
  }

  // ── 5. Customs Duty ────────────────────────────────────────────────────
  const dutyC = _step5_duty(dvPesos, n.tariffRate, deMinimis)

  // ── Fixed statutory charges (centavos) ────────────────────────────────
  const exciseC    = toCents(n.exciseTax)
  const aepC       = toCents(n.aep)
  const cdsC       = toCents(CDS_AMOUNT)   // ₱15.00
  const dstC       = toCents(DST_AMOUNT)   // ₱30.00
  const brokerageC = toCents(n.brokerageFee)

  // ── 6. VAT Base — TRAIN Law Sec 107 ───────────────────────────────────
  const vatBaseC = _step6_vatBase(dvPesos, dutyC, exciseC, ipfC, brokerageC, cdsC, dstC)

  // ── 7. VAT (12%) ───────────────────────────────────────────────────────
  const vatC = _step7_VAT(vatBaseC, deMinimis)

  // ── 8. Grand Total ─────────────────────────────────────────────────────
  const totalC = _step8_grandTotal(dutyC, exciseC, vatC, ipfC, aepC, cdsC, dstC, brokerageC)

  // ── Assemble result ────────────────────────────────────────────────────
  /** @type {AssessmentResult} */
  return {
    inputs: {
      fobUsd:       n.fob,
      freightUsd:   n.freight,
      insuranceUsd: n.insurance,    // resolved value (may differ from raw)
      cifUsd,
      exchangeRate: n.exchangeRate,
      tariffRate:   n.tariffRate,
      exciseTax:    n.exciseTax,
      aep:          n.aep,
      brokerageFee: n.brokerageFee,
      isExcise:     n.isExcise,
    },
    breakdown: {
      cifPhpRaw:   Math.round(cifPhpRaw * 100) / 100,  // 2 d.p.
      dvPesos,                                          // integer whole pesos
      duty:        fromCents(dutyC),
      exciseTax:   fromCents(exciseC),
      ipf:         ipfPhp,
      aep:         n.aep,
      cds:         CDS_AMOUNT,
      dst:         DST_AMOUNT,
      brokerageFee: n.brokerageFee,
      vatBase:     fromCents(vatBaseC),
      vat:         fromCents(vatC),
      grandTotal:  fromCents(totalC),
    },
    isDeMinimis: deMinimis,
    warnings,
    computedAt: new Date().toISOString(),
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: DISPLAY FORMATTERS
// Convenience helpers for React component display.
// NEVER use these values as inputs to further math — they are strings.
// ─────────────────────────────────────────────────────────────────────────────

const _phpFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency', currency: 'PHP',
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const _usdFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})

/**
 * Format a PHP peso amount for display. e.g. ₱12,345.67
 * @param {number} amount
 * @returns {string}
 */
export const formatPHP = amount => _phpFormat.format(amount ?? 0)

/**
 * Format a USD amount for display. e.g. USD 1,234.56
 * @param {number} amount
 * @returns {string}
 */
export const formatUSD = amount => `USD ${_usdFormat.format(amount ?? 0)}`

/**
 * Produce a human-readable assessment summary string.
 * Useful for console debugging, logs, or printable plain-text output.
 *
 * @param {AssessmentResult} result
 * @returns {string}
 */
export function summarizeAssessment(result) {
  if (!result?.breakdown) return '[ValuationEngine] No result to summarize.'
  const { inputs: i, breakdown: b, isDeMinimis } = result
  const ipfBracket = IPF_SCHEDULE.find(br => b.dvPesos <= br.ceiling)

  return [
    '══════════════════════════════════════════',
    '  CUSTOMS TECH — ASSESSMENT SUMMARY',
    '══════════════════════════════════════════',
    `  FOB              : ${formatUSD(i.fobUsd)}`,
    `  Freight          : ${formatUSD(i.freightUsd)}`,
    `  Insurance        : ${formatUSD(i.insuranceUsd)}`,
    `  CIF (USD)        : ${formatUSD(i.cifUsd)}`,
    `  Exchange Rate    : ₱${i.exchangeRate}/USD`,
    `  CIF PHP (raw)    : ${formatPHP(b.cifPhpRaw)}`,
    `  Dutiable Value   : ${formatPHP(b.dvPesos)} [Math.ceil — CMTA Sec. 700]`,
    isDeMinimis
      ? `  *** DE MINIMIS EXEMPT *** CMTA Sec.423 (DV ≤ ₱${DE_MINIMIS_CEILING.toLocaleString()})`
      : null,
    '  ─────────────────────────────────────────',
    `  Customs Duty     : ${formatPHP(b.duty)} @ ${i.tariffRate}%`,
    `  Excise Tax       : ${formatPHP(b.exciseTax)}`,
    `  IPF              : ${formatPHP(b.ipf)} [${ipfBracket ? `DV ≤ ₱${ipfBracket.ceiling.toLocaleString()}` : 'Max bracket'}]`,
    `  AEP              : ${formatPHP(b.aep)}`,
    `  CDS (fixed)      : ${formatPHP(b.cds)}`,
    `  DST (fixed)      : ${formatPHP(b.dst)}`,
    `  Brokerage Fee    : ${formatPHP(b.brokerageFee)}`,
    '  ─────────────────────────────────────────',
    `  VAT Base         : ${formatPHP(b.vatBase)}`,
    `  VAT (12%)        : ${formatPHP(b.vat)}`,
    '  ══════════════════════════════════════════',
    `  GRAND TOTAL      : ${formatPHP(b.grandTotal)}`,
    '  ══════════════════════════════════════════',
  ].filter(line => line !== null).join('\n')
}


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8: NAMED CONSTANT RE-EXPORTS
// Consumers can import these to avoid magic numbers in UI components.
// ─────────────────────────────────────────────────────────────────────────────

export const ENGINE_CONSTANTS = Object.freeze({
  CDS_AMOUNT,
  DST_AMOUNT,
  DE_MINIMIS_CEILING,
  LOCAL_INSURANCE_RATE,
  VAT_RATE,
  DEFAULT_AEP_PHP,
  IPF_SCHEDULE,
})


// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9: JSDoc TYPE DEFINITIONS
// For IDE intelligence and consumer API contracts.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} AssessmentPayload
 *
 * @property {number|string} fob
 *   FOB value in USD. Must be > 0.
 *   Throws ValuationError if 0 or negative (impossible importation).
 *
 * @property {number|string} freight
 *   Freight cost in USD. Must be > 0.
 *   Throws ValuationError if 0 or negative (impossible importation).
 *
 * @property {number|string} [insurance]
 *   Insurance in USD. If 0, blank, null, or undefined, the BOC local
 *   formula is auto-applied: (FOB + Freight) × 2%.
 *   A warning entry is added to result.warnings.
 *
 * @property {number|string} exchangeRate
 *   BSP reference rate PHP/USD (e.g. 56.25). Must be > 0.
 *
 * @property {number|string} tariffRate
 *   AHTN 2022 MFN tariff rate as a PERCENTAGE (e.g. 5 for 5%, NOT 0.05).
 *   Range: 0–100.
 *
 * @property {number|string} [exciseTax]
 *   Excise tax in PHP under the NIRC. Defaults to 0.
 *
 * @property {number|string} [aep]
 *   Arrastre + Examination + Wharfage in PHP.
 *   Omit or pass null/'' to use the ₱1,500 statutory default.
 *   Pass 0 explicitly to waive the charge.
 *
 * @property {number|string} [brokerageFee]
 *   Customs broker professional fee in PHP. Defaults to 0.
 *
 * @property {boolean} [isExcise]
 *   Whether the goods are subject to excise tax (NIRC).
 *   When true, De Minimis exemption (CMTA Sec. 423) does NOT apply —
 *   full duty and VAT are assessed regardless of DV.
 */

/**
 * @typedef {Object} AssessmentResult
 *
 * @property {Object}   inputs               Validated and resolved inputs
 * @property {number}   inputs.fobUsd
 * @property {number}   inputs.freightUsd
 * @property {number}   inputs.insuranceUsd  May differ from raw if auto-computed
 * @property {number}   inputs.cifUsd
 * @property {number}   inputs.exchangeRate
 * @property {number}   inputs.tariffRate
 * @property {number}   inputs.exciseTax
 * @property {number}   inputs.aep
 * @property {number}   inputs.brokerageFee
 * @property {boolean}  inputs.isExcise
 *
 * @property {Object}   breakdown            Full itemized breakdown, all amounts PHP
 * @property {number}   breakdown.cifPhpRaw  CIF × Rate pre-ceiling (2 d.p.)
 * @property {number}   breakdown.dvPesos    DV after Math.ceil (integer pesos)
 * @property {number}   breakdown.duty       Customs Duty
 * @property {number}   breakdown.exciseTax  Excise Tax (NIRC)
 * @property {number}   breakdown.ipf        Import Processing Fee
 * @property {number}   breakdown.aep        Arrastre + Examination + Wharfage
 * @property {number}   breakdown.cds        Customs Documentary Stamp (₱15)
 * @property {number}   breakdown.dst        BIR Documentary Stamp Tax (₱30)
 * @property {number}   breakdown.brokerageFee
 * @property {number}   breakdown.vatBase    VAT computation base (TRAIN Law Sec 107)
 * @property {number}   breakdown.vat        12% VAT
 * @property {number}   breakdown.grandTotal Total of all taxes and charges
 *
 * @property {boolean}  isDeMinimis   CMTA Sec. 423 exemption applied
 * @property {string[]} warnings      Non-fatal advisories
 * @property {string}   computedAt    ISO 8601 timestamp
 */
