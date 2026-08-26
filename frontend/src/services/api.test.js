import { describe, expect, test, vi } from 'vitest'
import { authenticatedBlob, setSession } from './api'

describe('authenticatedBlob', () => {
  test('renova a sessão e repete o download após token expirado', async () => {
    setSession({ access_token: 'expirado', refresh_token: 'refresh-valido' })
    const file = new Blob(['pdf'], { type: 'application/pdf' })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ status: 401, ok: false })
      .mockResolvedValueOnce({
        status: 200,
        ok: true,
        json: async () => ({ access_token: 'novo-access', refresh_token: 'novo-refresh' }),
      })
      .mockResolvedValueOnce({ status: 200, ok: true, blob: async () => file })
    vi.stubGlobal('fetch', fetchMock)

    await expect(authenticatedBlob('/documents/doc/versions/version/file')).resolves.toBe(file)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[2][1].headers.Authorization).toBe('Bearer novo-access')
  })
})
