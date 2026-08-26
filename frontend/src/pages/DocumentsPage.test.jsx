import { screen } from '@testing-library/react'
import { vi } from 'vitest'
import { authenticatedSession, jsonResponse, renderApp, sampleDocument } from '../test/renderApp'

test('document list renders real metadata and status', async () => {
  authenticatedSession()
  vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (url.toString().includes('/documents?'))
      return jsonResponse({ items: [sampleDocument], total: 1, page: 1, page_size: 20 })
    if (url.toString().endsWith('/users'))
      return jsonResponse([sampleDocument.author, sampleDocument.reviewer])
    return jsonResponse([])
  })
  renderApp('/documents')
  expect(await screen.findAllByText('Política de Segurança da Informação')).toHaveLength(2)
  expect(screen.getAllByText('Em revisão')).toHaveLength(3)
  expect(screen.getAllByText('v1.0')).toHaveLength(2)
})
