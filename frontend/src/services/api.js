const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

let refreshing = null

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('docflow-session'))
  } catch {
    return null
  }
}

function setSession(session) {
  if (session) localStorage.setItem('docflow-session', JSON.stringify(session))
  else localStorage.removeItem('docflow-session')
  window.dispatchEvent(new CustomEvent('docflow-session', { detail: session }))
}

async function refreshSession() {
  const session = getSession()
  if (!session?.refresh_token) throw new Error('Session expired')
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  if (!response.ok) {
    setSession(null)
    throw new Error('Session expired')
  }
  const next = await response.json()
  setSession(next)
  return next
}

export async function api(path, options = {}, retry = true) {
  const session = getSession()
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers,
  }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (response.status === 401 && retry && session?.refresh_token && !path.startsWith('/auth/')) {
    refreshing ||= refreshSession().finally(() => {
      refreshing = null
    })
    await refreshing
    return api(path, options, false)
  }
  if (!response.ok) {
    let error
    try {
      error = await response.json()
    } catch {
      error = { error: { message: 'Não foi possível concluir a operação.' } }
    }
    const apiError = new Error(error.error?.message || 'Não foi possível concluir a operação.')
    apiError.code = error.error?.code
    apiError.status = response.status
    throw apiError
  }
  if (response.status === 204) return null
  return response.json()
}

export async function authenticatedBlob(path) {
  const session = getSession()
  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })
  if (!response.ok) throw new Error('Não foi possível abrir o arquivo.')
  return response.blob()
}

export { API_URL, getSession, setSession }
