import { fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { jsonResponse, renderApp } from '../test/renderApp'

test('login authenticates demo admin and opens dashboard', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (url.toString().endsWith('/auth/login')) {
      return jsonResponse({
        access_token: 'token',
        refresh_token: 'refresh',
        expires_in: 900,
        token_type: 'bearer',
        user: { id: 'admin-1', name: 'Ana Ribeiro', email: 'admin@docflow.demo', role: 'ADMIN' },
      })
    }
    if (url.toString().includes('/documents/dashboard')) {
      return jsonResponse({
        metrics: { total: 0, in_review: 0, changes_requested: 0, approved: 0 },
        by_status: {
          DRAFT: 0,
          IN_REVIEW: 0,
          CHANGES_REQUESTED: 0,
          APPROVED: 0,
          PUBLISHED: 0,
          ARCHIVED: 0,
        },
        recent_documents: [],
        pending_reviews: [],
        recent_activity: [],
      })
    }
    return jsonResponse([])
  })
  renderApp('/login')
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }))
  await waitFor(() => expect(screen.getByText('O trabalho está fluindo.')).toBeInTheDocument())
  expect(JSON.parse(localStorage.getItem('docflow-session')).access_token).toBe('token')
})

test('login exposes validation feedback', async () => {
  renderApp('/login')
  fireEvent.change(screen.getByLabelText('E-mail corporativo'), { target: { value: 'invalid' } })
  fireEvent.submit(screen.getByRole('button', { name: /entrar/i }).closest('form'))
  expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
})
