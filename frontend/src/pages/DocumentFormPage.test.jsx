import { fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { authenticatedSession, jsonResponse, renderApp } from '../test/renderApp'

test('formulário rejeita campos obrigatórios preenchidos apenas com espaços', async () => {
  authenticatedSession()
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (url.toString().endsWith('/users')) return jsonResponse([])
    return jsonResponse([])
  })
  renderApp('/documents/new')

  fireEvent.change(screen.getByLabelText('Título'), { target: { value: '   ' } })
  fireEvent.change(screen.getByLabelText('Categoria'), { target: { value: 'Operações' } })
  fireEvent.change(screen.getByLabelText('Conteúdo'), {
    target: { value: 'Conteúdo válido do documento.' },
  })
  fireEvent.change(screen.getByLabelText('Resumo das alterações'), {
    target: { value: '   ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Criar rascunho' }))

  expect(
    await screen.findByText('Informe um título com ao menos 3 caracteres.'),
  ).toBeInTheDocument()
  expect(screen.getByText('Descreva esta versão.')).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledTimes(1)
})
