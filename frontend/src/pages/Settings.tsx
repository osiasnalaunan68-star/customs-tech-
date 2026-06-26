import { useState, useEffect, type ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Settings as SettingsIcon, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

const API: string = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface SettingsForm {
  usd_to_php_rate: string
  broker_name:        string
  broker_prc_license: string
  broker_tin:         string
}

type Toast = { msg: string; type: 'success' | 'error' } | null

const EMPTY: SettingsForm = {
  usd_to_php_rate:    '',
  broker_name:        '',
  broker_prc_license: '',
  broker_tin:         '',
}

export default function Settings() {
  const [form,        setForm]        = useState<SettingsForm>(EMPTY)
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [fetchError,  setFetchError]  = useState<string | null>(null)
  const [toast,       setToast]       = useState<Toast>(null)

  // ── Auto-dismiss toast ────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4500)
  }

  // ── Fetch on mount ────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(`${API}/api/settings/`)
        if (!res.ok) throw new Error(`Server returned ${res.status}`)
        const data = await res.json()
        setForm({
          usd_to_php_rate:    String(data.usd_to_php_rate ?? '56.0000'),
          broker_name:        data.broker_name        ?? '',
          broker_prc_license: data.broker_prc_license ?? '',
          broker_tin:         data.broker_tin         ?? '',
        })
      } catch (e: any) {
        setFetchError('Could not load settings — check backend connection.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handle = (field: keyof SettingsForm) =>
    (e: ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  // ── Save (PUT) ────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        usd_to_php_rate:    parseFloat(form.usd_to_php_rate) || 56.0,
        broker_name:        form.broker_name.trim()        || null,
        broker_prc_license: form.broker_prc_license.trim() || null,
        broker_tin:         form.broker_tin.trim()         || null,
      }
      const res = await fetch(`${API}/api/settings/`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
      showToast('Configuration saved successfully.', 'success')
    } catch (e: any) {
      showToast(e.message || 'Failed to save settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-600 focus:border-sky-500'
  const labelCls = 'text-slate-300 text-xs font-bold uppercase tracking-wider'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-green-950 border-green-800 text-green-300'
            : 'bg-red-950  border-red-800  text-red-300'
        }`}>
          {toast.type === 'success'
            ? <CheckCircle2 size={16} className="text-green-400 shrink-0" />
            : <XCircle      size={16} className="text-red-400   shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center gap-3">
        <SettingsIcon className="text-sky-400" size={22} />
        <div>
          <h1 className="text-white font-bold text-xl">Global Configuration</h1>
          <p className="text-slate-400 text-sm">
            Platform-wide defaults applied to all new duty computations.
          </p>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-500">
          <Loader2 className="animate-spin mr-2" size={18} />
          Loading settings…
        </div>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base font-semibold">
              Exchange Rate & Broker Profile
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              These values pre-fill the Assessment Builder and Duty Calculator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

              {/* Exchange rate */}
              <div className="space-y-1.5">
                <Label className={labelCls}>USD to PHP Exchange Rate</Label>
                <Input type="number" step="0.0001" placeholder="56.0000"
                  value={form.usd_to_php_rate}
                  onChange={handle('usd_to_php_rate')}
                  className={inputCls} />
                <p className="text-slate-600 text-[11px]">
                  BSP reference rate — used as the default for all computations.
                </p>
              </div>

              {/* Broker TIN */}
              <div className="space-y-1.5">
                <Label className={labelCls}>Broker TIN</Label>
                <Input placeholder="000-000-000-000"
                  value={form.broker_tin}
                  onChange={handle('broker_tin')}
                  className={inputCls} />
              </div>

              {/* Broker name */}
              <div className="space-y-1.5">
                <Label className={labelCls}>Principal Broker Name</Label>
                <Input placeholder="Full name as on PRC ID"
                  value={form.broker_name}
                  onChange={handle('broker_name')}
                  className={inputCls} />
              </div>

              {/* PRC license */}
              <div className="space-y-1.5">
                <Label className={labelCls}>PRC License No.</Label>
                <Input placeholder="0012345"
                  value={form.broker_prc_license}
                  onChange={handle('broker_prc_license')}
                  className={inputCls} />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-700 flex justify-end">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold min-w-[160px]"
              >
                {saving && <Loader2 className="animate-spin mr-2" size={15} />}
                {saving ? 'Saving…' : 'Save Configuration'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
