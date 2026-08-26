import { fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { authenticatedSession, jsonResponse, renderApp } from '../test/renderApp'

const users = [
  {
    id: 'admin-1',
    name: 'Ana Ribeiro',
    email: 'admin@docflow.demo',
    cpf: '90000000175',
    role: 'ADMIN',
    is_active: true,
    created_at: '2026-08-20T10:00:00Z',
  },
  {
    id: 'collaborator-1',
    name: 'Bruno Costa',
    email: 'collaborator@docflow.demo',
    cpf: '90000000256',
    role: 'COLLABORATOR',
    is_active: true,
    created_at: '2026-08-21T10:00:00Z',
  },
]

test('cadastra usuário com CPF e confirmação de senha', async () => {
  authenticatedSession()
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) => {
    if (options.method === 'POST') return jsonResponse({ ...users[1], id: 'new-user' }, 201)
    return jsonResponse(users)
  })
  renderApp('/users')

  await screen.findAllByText('Bruno Costa')
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar usuário' }))
  fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Carla Dias' } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'carla@docflow.demo' } })
  fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '52998224725' } })
  fireEvent.change(screen.getByLabelText('Senha temporária'), {
    target: { value: 'SenhaSegura2026!' },
  })
  fireEvent.change(screen.getByLabelText('Repetir senha'), {
    target: { value: 'SenhaSegura2026!' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Cadastrar' }))

  await waitFor(() =>
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'POST')).toBe(true),
  )
  const request = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST')
  expect(request[0].toString()).toMatch(/\/users$/)
  const payload = JSON.parse(request[1].body)
  expect(payload.cpf).toBe('52998224725')
  expect(payload.password).toBe('SenhaSegura2026!')
  expect(payload).not.toHaveProperty('password_confirmation')
})

test('edita, inativa e solicita exclusão com confirmação', async () => {
  authenticatedSession()
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url, options = {}) => {
    if (options.method === 'PATCH') {
      const payload = JSON.parse(options.body)
      return jsonResponse({ ...users[1], ...payload })
    }
    if (options.method === 'DELETE') return jsonResponse({ message: 'User deleted' })
    return jsonResponse(users)
  })
  renderApp('/users')

  await screen.findAllByText('Bruno Costa')
  fireEvent.click(screen.getAllByLabelText('Editar Bruno Costa')[0])
  expect(screen.getByLabelText('Nova senha')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: 'NovaSenha2026!' } })
  fireEvent.change(screen.getByLabelText('Repetir senha'), { target: { value: 'NovaSenha2026!' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'PATCH')).toHaveLength(1),
  )

  fireEvent.click(screen.getAllByLabelText('Inativar Bruno Costa')[0])
  fireEvent.click(screen.getByRole('button', { name: 'Inativar' }))
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'PATCH')).toHaveLength(2),
  )

  fireEvent.click(screen.getAllByLabelText('Excluir Bruno Costa')[0])
  expect(screen.getByText(/exclusão só será permitida/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Excluir permanentemente' }))
  await waitFor(() =>
    expect(fetchMock.mock.calls.filter((call) => call[1]?.method === 'DELETE')).toHaveLength(1),
  )
})
