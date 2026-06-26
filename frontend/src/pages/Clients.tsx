import { useState, useEffect, useMemo, type ChangeEvent } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button }             from '@/components/ui/button'
import { Input }              from '@/components/ui/input'
import { Label }              from '@/components/ui/label'
import { Badge }              from '@/components/ui/badge'
import { Switch }             from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Users, Plus, CheckCircle2, XCircle,
  Loader2, AlertTriangle, RefreshCw,
} from 'lucide-react'

const API: string = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────
interface Client {
  id:               string
  company_name:     string
  importer_tin:     string | null
  cprs_status:      'Active' | 'Expired' | 'Suspended' | null
  cprs_expiry:      string | null
  contact_person:   string | null
  email:            string | null
  phone:            string | null
  cprs_expiring_soon: boolean
  created_at?:      string
}

interface ClientForm {
  company_name:   string
  importer_tin:   string
  cprs_status:    string
  cprs_expiry:    string
  contact_person: string
  email:          string
  phone:          string
}

type Toast = { msg: string; type: 'success' | 'error' } | null

const EMPTY_FORM: ClientForm = {
  company_name:   '',
  importer_tin:   '',
  cprs_status:    'Active',
  cprs_expiry:    '',
  contact_person: '',
  email:          '',
  phone:          '',
}

// ── Sub-components ────────────────────────────────────────────────
function CPRSBadge({ status, expiringSoon }: { status: string | null; expiringSoon: boolean }) {
  if (status === 'Expired')
    return (
      <Badge className="bg-red-900/60 text-red-300 border border-red-700 hover:bg-red-900/60 gap-1">
        <XCircle size={11} />Expired
      </Badge>
    )
  if (status === 'Suspended')
    return (
      <Badge className="bg-orange-900/60 text-orange-300 border border-orange-700 hover:bg-orange-900/60">
        Suspended
      </Badge>
    )
  if (expiringSoon)
    return (
      <Badge className="bg-amber-900/60 text-amber-300 border border-amber-700 hover:bg-amber-900/60 gap-1">
        <AlertTriangle size={11} />Expiring Soon
      </Badge>
    )
  return (
    <Badge className="bg-green-900/60 text-green-300 border border-green-700 hover:bg-green-900/60">
      Active
    </Badge>
  )
}

function fmtDate(d: string | null): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch { return d }
}

// ── Main Component ────────────────────────────────────────────────
export default function Clients() {
  const [clients,        setClients]        = useState<Client[]>([])
  const [loading,        setLoading]        = useState(true)
  const [fetchError,     setFetchError]     = useState<string | null>(null)
  const [toast,          setToast]          = useState<Toast>(null)
  const [filterExpiring, setFilterExpiring] = useState(false)
  const [dialogOpen,     setDialogOpen]     = useState(false)
  const [form,           setForm]           = useState<ClientForm>(EMPTY_FORM)
  const [submitting,     setSubmitting]     = useState(false)
  const [formError,      setFormError]      = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  // ── Fetch ───────────────────────────────────────────────────────
  const fetchClients = async () => {
    setLoading(true); setFetchError(null)
    try {
      const res = await fetch(`${API}/api/clients/`)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      setClients(await res.json())
    } catch (e: any) {
      setFetchError('Could not load clients — check backend connection.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { fetchClients() }, [])

  // ── Derived state ───────────────────────────────────────────────
  const expiringCount = useMemo(
    () => clients.filter(c => c.cprs_status === 'Expired' || c.cprs_expiring_soon || c.cprs_status === 'Suspended').length,
    [clients]
  )
  const displayed = useMemo(
    () => filterExpiring
      ? clients.filter(c => c.cprs_status === 'Expired' || c.cprs_expiring_soon || c.cprs_status === 'Suspended')
      : clients,
    [clients, filterExpiring]
  )

  // ── Form handlers ───────────────────────────────────────────────
  const setField = (field: keyof ClientForm) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))

  const closeDialog = () => { setDialogOpen(false); setForm(EMPTY_FORM); setFormError(null) }

  const handleSubmit = async () => {
    if (!form.company_name.trim()) { setFormError('Company name is required.'); return }
    setSubmitting(true); setFormError(null)
    try {
      const payload = {
        company_name:   form.company_name.trim(),
        importer_tin:   form.importer_tin.trim()   || null,
        cprs_status:    form.cprs_status            || 'Active',
        cprs_expiry:    form.cprs_expiry            || null,
        contact_person: form.contact_person.trim()  || null,
        email:          form.email.trim()           || null,
        phone:          form.phone.trim()           || null,
      }
      const res = await fetch(`${API}/api/clients/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
      closeDialog()
      showToast(`Client "${form.company_name}" registered successfully.`, 'success')
      await fetchClients()
    } catch (e: any) {
      setFormError(e.message || 'Failed to add client. Check inputs and retry.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Shared style tokens ─────────────────────────────────────────
  const inputCls = 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-600 focus:border-sky-500'
  const labelCls = 'text-slate-300 text-xs font-bold uppercase tracking-wider'

  return (
    <div className="p-6 space-y-5">

      {/* Toast notification */}
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

      {/* Page header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">

        {/* Title */}
        <div className="flex items-center gap-3">
          <Users className="text-sky-400" size={22} />
          <div>
            <h1 className="text-white font-bold text-xl">Clients</h1>
            <p className="text-slate-400 text-sm">{clients.length} registered importers</p>
          </div>
        </div>

        {/* Controls: toggle + refresh + add */}
        <div className="flex items-center gap-4 flex-wrap">

          {/* Expiring-only toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="filter-expiring"
              checked={filterExpiring}
              onCheckedChange={setFilterExpiring}
              className="data-[state=checked]:bg-amber-500"
            />
            <label htmlFor="filter-expiring" className="text-sm text-slate-300 cursor-pointer select-none whitespace-nowrap">
              Expiring records only
              {expiringCount > 0 && (
                <span className="ml-1.5 font-bold text-amber-400">({expiringCount})</span>
              )}
            </label>
          </div>

          {/* Refresh */}
          <Button variant="ghost" size="sm"
            onClick={fetchClients}
            className="text-slate-400 hover:text-white gap-1.5 border border-slate-700">
            <RefreshCw size={14} />Refresh
          </Button>

          {/* Add Client dialog */}
          <Dialog open={dialogOpen} onOpenChange={o => o ? setDialogOpen(true) : closeDialog()}>
            <DialogTrigger asChild>
              <Button className="bg-sky-600 hover:bg-sky-500 text-white font-semibold gap-1.5">
                <Plus size={16} />Add Client
              </Button>
            </DialogTrigger>

            <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white text-lg">Register New Client</DialogTitle>
              </DialogHeader>

              {formError && (
                <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-300 text-sm px-3 py-2 rounded-md">
                  <XCircle size={14} className="shrink-0" />{formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className={labelCls}>Company Name *</Label>
                  <Input placeholder="ABC Trading Corp."
                    value={form.company_name} onChange={setField('company_name')}
                    className={inputCls} />
                </div>

                <div className="space-y-1.5">
                  <Label className={labelCls}>Importer TIN</Label>
                  <Input placeholder="000-000-000-000"
                    value={form.importer_tin} onChange={setField('importer_tin')}
                    className={inputCls} />
                </div>

                <div className="space-y-1.5">
                  <Label className={labelCls}>CPRS Status</Label>
                  <select value={form.cprs_status} onChange={setField('cprs_status')}
                    className="w-full h-9 px-3 rounded-md border border-slate-600 bg-slate-900 text-white text-sm focus:outline-none focus:border-sky-500">
                    <option value="Active">Active</option>
                    <option value="Expired">Expired</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className={labelCls}>CPRS Expiry Date</Label>
                  <Input type="date"
                    value={form.cprs_expiry} onChange={setField('cprs_expiry')}
                    className={`${inputCls} [color-scheme:dark]`} />
                </div>

                <div className="space-y-1.5">
                  <Label className={labelCls}>Contact Person</Label>
                  <Input placeholder="Juan dela Cruz"
                    value={form.contact_person} onChange={setField('contact_person')}
                    className={inputCls} />
                </div>

                <div className="space-y-1.5">
                  <Label className={labelCls}>Email</Label>
                  <Input type="email" placeholder="info@company.ph"
                    value={form.email} onChange={setField('email')}
                    className={inputCls} />
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <Label className={labelCls}>Phone</Label>
                  <Input placeholder="+63 912 345 6789"
                    value={form.phone} onChange={setField('phone')}
                    className={inputCls} />
                </div>
              </div>

              <DialogFooter className="pt-2 gap-2">
                <Button variant="ghost" onClick={closeDialog}
                  className="text-slate-400 hover:text-white border border-slate-700">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-semibold min-w-[150px]">
                  {submitting && <Loader2 className="animate-spin mr-2" size={15} />}
                  {submitting ? 'Registering…' : 'Register Client'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg">
          {fetchError}
        </div>
      )}

      {/* Data table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-500">
              <Loader2 className="animate-spin mr-2" size={18} />Loading clients…
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              {filterExpiring
                ? 'No expiring or suspended clients found.'
                : 'No clients yet — click "Add Client" to register one.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    {['Company','TIN','CPRS Status','Expiry','Contact','Email','Phone'].map(h => (
                      <TableHead key={h}
                        className="text-slate-400 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayed.map(client => (
                    <TableRow key={client.id}
                      className="border-slate-700 hover:bg-slate-700/40 transition-colors">
                      <TableCell className="font-semibold text-white text-sm max-w-[180px]">
                        <span className="truncate block">{client.company_name}</span>
                      </TableCell>
                      <TableCell className="text-slate-400 font-mono text-xs whitespace-nowrap">
                        {client.importer_tin ?? '—'}
                      </TableCell>
                      <TableCell>
                        <CPRSBadge status={client.cprs_status} expiringSoon={client.cprs_expiring_soon} />
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                        {fmtDate(client.cprs_expiry)}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                        {client.contact_person ?? '—'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm">
                        {client.email ?? '—'}
                      </TableCell>
                      <TableCell className="text-slate-300 text-sm whitespace-nowrap">
                        {client.phone ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
