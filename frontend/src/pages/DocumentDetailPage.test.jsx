import { screen } from '@testing-library/react'
import { vi } from 'vitest'
import { authenticatedSession, jsonResponse, renderApp, sampleDocument } from '../test/renderApp'

test('document detail shows content, versions, comments and history', async () => {
  authenticatedSession()
  vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    const path = url.toString()
    if (path.endsWith('/documents/document-1')) return jsonResponse(sampleDocument)
    if (path.endsWith('/comments'))
      return jsonResponse([
        {
          id: 'comment-1',
          message: 'Inclua o prazo de resposta.',
          user: sampleDocument.reviewer,
          created_at: '2026-08-21T11:00:00Z',
        },
      ])
    if (path.endsWith('/history'))
      return jsonResponse([
        {
          id: 'history-1',
          action: 'SENT_TO_REVIEW',
          details: 'sent for review',
          user: sampleDocument.author,
          created_at: '2026-08-21T10:00:00Z',
        },
      ])
    return jsonResponse({})
  })
  renderApp('/documents/document-1')
  expect(await screen.findByRole('heading', { name: sampleDocument.title })).toBeInTheDocument()
  expect(screen.getByText(sampleDocument.current_content)).toBeInTheDocument()
  expect(await screen.findByText('Inclua o prazo de resposta.')).toBeInTheDocument()
  expect(screen.getByText('Versões')).toBeInTheDocument()
})
