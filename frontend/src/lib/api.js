import { supabase } from './supabase'
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
async function req(path, opts = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}), ...opts.headers }
  })
  if (!res.ok) { const t = await res.text(); throw new Error(t) }
  return res.json()
}
export const api = {
  get:  path       => req(path),
  post: (path, b)  => req(path, { method:'POST', body:JSON.stringify(b) }),
  put:  (path, b)  => req(path, { method:'PUT',  body:JSON.stringify(b) }),
  del:  path       => req(path, { method:'DELETE' }),
}
