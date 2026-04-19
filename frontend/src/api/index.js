// src/api/index.js
const BASE = 'http://localhost:8000'

export async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'API Error')
  return data
}

export async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'API Error')
  return data
}

export async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'API Error')
  return data
}

export async function patch(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'API Error')
  return data
}

export async function del(path) {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'API Error')
  return data
}
