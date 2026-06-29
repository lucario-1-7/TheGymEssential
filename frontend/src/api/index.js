// src/api/index.js
const BASE = 'http://localhost:8000'

function authHeaders() {
  const t = localStorage.getItem('token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function handle(res) {
  if (res.status === 401) {
    // Token missing/expired — drop credentials and bounce to login.
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    if (!window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    throw new Error('Unauthorized')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'API Error')
  return data
}

export async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { ...authHeaders() } })
  return handle(res)
}

export async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  return handle(res)
}

export async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  return handle(res)
}

export async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  })
  return handle(res)
}

export async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: { ...authHeaders() } })
  return handle(res)
}
