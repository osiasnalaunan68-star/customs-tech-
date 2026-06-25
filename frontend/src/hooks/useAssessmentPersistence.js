import { useState, useCallback } from 'react'
import { assessmentApi } from '../lib/assessmentApi'
import { calculateAssessment, ValuationError } from '../lib/ValuationEngine'

export function useAssessmentPersistence({ formState, company, sub }) {
  const [record, setRecord] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const [toast,  setToast]  = useState(null)

  const notify = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  const buildPayload = useCallback(() => {
    let result
    try {
      result = calculateAssessment({
        fob:          formState.fob,
        freight:      formState.freight,
        insurance:    formState.insurance,
        exchangeRate: formState.exchange_rate,
        tariffRate:   formState.duty_rate,
        exciseTax:    formState.excise_tax  || 0,
        aep:          formState.aep,
        brokerageFee: formState.brokerage,
        isExcise:     false,
      })
    } catch (e) {
      throw new Error(e instanceof ValuationError ? e.errors.join(' | ') : (e.message || 'Computation error'))
    }
    return {
      bl_number:      formState.bl_number      || null,
      invoice_no:     formState.invoice_no     || null,
      container_no:   formState.container_no   || null,
      incoterms:      formState.incoterms      || 'CIF',
      commodity:      formState.commodity      || null,
      ahtn_code:      formState.ahtn_code      || null,
      origin_country: formState.origin_country || null,
      port_of_entry:  formState.port           || 'Manila',
      importer:       formState.importer       || null,
      consignee:      formState.consignee      || null,
      declarant_name: formState.declarant_name || null,
      broker_tin:     formState.broker_tin     || null,
      prc_license_no: formState.prc_no         || null,
      company_name:   company                  || null,
      company_sub:    sub                      || null,
      inputs:         result.inputs,
      outputs:        result.breakdown,
      is_de_minimis:  result.isDeMinimis,
      engine_version: '1.0.0',
      warnings:       result.warnings.length ? result.warnings : null,
    }
  }, [formState, company, sub])

  const saveDraft = useCallback(async (revisionNote) => {
    setSaving(true); setError(null)
    try {
      const payload = buildPayload()
      const rec = record?.id
        ? await assessmentApi.update(record.id, { ...payload, revision_note: revisionNote || undefined })
        : await assessmentApi.create(payload)
      setRecord(rec); notify(`Draft saved — ACN: ${rec.acn}`); return rec
    } catch (e) { setError(e.message); notify(e.message, 'err'); throw e }
    finally { setSaving(false) }
  }, [buildPayload, record])

  const submitForReview = useCallback(async () => {
    setSaving(true); setError(null)
    try {
      let rec = record
      if (!rec?.id) rec = await assessmentApi.create(buildPayload())
      const submitted = await assessmentApi.submit(rec.id)
      setRecord(submitted); notify(`Submitted — ACN: ${submitted.acn}`); return submitted
    } catch (e) { setError(e.message); notify(e.message, 'err'); throw e }
    finally { setSaving(false) }
  }, [buildPayload, record])

  const loadAssessment = useCallback(async (id) => {
    const rec = await assessmentApi.get(id); setRecord(rec); return rec
  }, [])

  return { record, saving, error, toast, saveDraft, submitForReview, loadAssessment }
}
/*
USAGE IN AssessmentNoticePrintable.jsx — add these lines:

  import { useAssessmentPersistence } from '../hooks/useAssessmentPersistence'
  const { record, saving, toast, saveDraft, submitForReview } =
    useAssessmentPersistence({ formState: f, company, sub })

  Add in editor column before print button:
  {toast && <div className={toast.type==='err'?'err':'ok'} style={{marginBottom:'8px'}}>{toast.msg}</div>}
  <button onClick={()=>saveDraft()} disabled={saving} style={{...navyBtnStyle}}>
    {saving?'Saving…':`💾 Save Draft${record?` (${record.acn})`:''}`}
  </button>
  <button onClick={submitForReview} disabled={saving||record?.status!=='draft'} style={{...greenBtnStyle}}>
    📤 Submit for Review
  </button>
*/
