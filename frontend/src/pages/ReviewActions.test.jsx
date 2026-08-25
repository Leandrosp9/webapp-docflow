import { fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { authenticatedSession, jsonResponse, renderApp, sampleDocument } from '../test/renderApp'

test('assigned reviewer can approve with confirmation and feedback', async () => {
  authenticatedSession(sampleDocument.reviewer)
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) => {
    const path = url.toString()
    if (path.endsWith('/documents/document-1/review') && options.method === 'POST')
      return jsonResponse({ message: 'Review recorded' })
    if (path.endsWith('/documents/document-1'))
      return jsonResponse({
        ...sampleDocument,
        permissions: { ...sampleDocument.permissions, archive: false },
      })
    if (path.endsWith('/comments') || path.endsWith('/history')) return jsonResponse([])
    return jsonResponse({})
  })
  renderApp('/documents/document-1')
  fireEvent.click(await screen.findByRole('button', { name: 'Aprovar' }))
  expect(screen.getByRole('dialog', { name: 'Aprovar documento?' })).toBeInTheDocument()
  fireEvent.click(screen.getAllByRole('button', { name: 'Aprovar' }).at(-1))
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/review'),
      expect.objectContaining({ method: 'POST' }),
    ),
  )
  expect(await screen.findByText('Documento aprovado.')).toBeInTheDocument()
})
