import { supabase } from './supabase'
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
async function req(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  if (!res.ok) { const t = await res.text(); throw new Error(t || `HTTP ${res.status}`) }
  if (res.status === 204) return null
  return res.json()
}
export const assessmentApi = {
  list: (p = {}) => {
    const q = new URLSearchParams()
    if (p.status) q.set('status', p.status)
    if (p.limit)  q.set('limit',  String(p.limit))
    if (p.offset) q.set('offset', String(p.offset))
    return req(`/assessments?${q}`)
  },
  get:      id       => req(`/assessments/${id}`),
  create:   body     => req('/assessments',              { method:'POST',   body:JSON.stringify(body) }),
  update:   (id, b)  => req(`/assessments/${id}`,        { method:'PUT',    body:JSON.stringify(b)    }),
  submit:   id       => req(`/assessments/${id}/submit`, { method:'POST'                              }),
  workflow: (id, b)  => req(`/assessments/${id}/workflow`,{ method:'POST',  body:JSON.stringify(b)   }),
  remove:   id       => req(`/assessments/${id}`,        { method:'DELETE'                            }),
}
