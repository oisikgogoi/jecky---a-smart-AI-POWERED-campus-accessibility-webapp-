const API_BASE = '/api'

export async function apiRequest(path, { token, ...options } = {}) {
  const headers = new Headers(options.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The request could not be completed.')
  return result
}

export async function loadApiData(resource) {
  const result = await apiRequest(resource)
  return result[resource.slice(1)]
}
