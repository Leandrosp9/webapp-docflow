import { fireEvent, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { authenticatedSession, jsonResponse, renderApp } from '../test/renderApp'

class FakeMediaRecorder {
  static isTypeSupported() {
    return true
  }

  constructor(stream, options) {
    this.stream = stream
    this.mimeType = options?.mimeType || 'audio/webm'
    this.state = 'inactive'
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    this.ondataavailable({ data: new Blob(['audio-capturado'], { type: this.mimeType }) })
    this.onstop()
  }
}

test('grava, mostra a transcrição corrigida e só insere após confirmação', async () => {
  authenticatedSession()
  const stopTrack = vi.fn()
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }) },
  })
  Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder })
  Object.defineProperty(globalThis, 'MediaRecorder', {
    configurable: true,
    value: FakeMediaRecorder,
  })
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
    if (url.toString().endsWith('/users')) return jsonResponse([])
    if (url.toString().endsWith('/ai/transcribe-audio')) {
      return jsonResponse({ text: 'Esta é a mensagem corrigida.' })
    }
    return jsonResponse([])
  })
  renderApp('/documents/new')

  fireEvent.click(await screen.findByRole('button', { name: 'Gravar mensagem' }))
  expect(await screen.findByRole('button', { name: /Parar/ })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Parar/ }))

  expect(await screen.findByLabelText('Prévia corrigida')).toHaveValue(
    'Esta é a mensagem corrigida.',
  )
  expect(screen.getByLabelText('Conteúdo')).toHaveValue('')
  fireEvent.click(screen.getByRole('button', { name: 'Adicionar ao conteúdo' }))

  await waitFor(() =>
    expect(screen.getByLabelText('Conteúdo')).toHaveValue('Esta é a mensagem corrigida.'),
  )
  expect(stopTrack).toHaveBeenCalled()
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData)
})

test('informa quando o navegador não oferece gravação', async () => {
  authenticatedSession()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined })
  Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined })
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([]))
  renderApp('/documents/new')

  fireEvent.click(await screen.findByRole('button', { name: 'Gravar mensagem' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('não é compatível')
})
