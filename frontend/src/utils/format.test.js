import { describe, expect, test } from 'vitest'
import { formatHistoryDetails } from './format'

describe('formatHistoryDetails', () => {
  test('traduz detalhes legados que ainda existem no banco publicado', () => {
    expect(formatHistoryDetails('VERSION_CREATED', 'published version v1.1')).toBe(
      'criou a versão v1.1',
    )
    expect(
      formatHistoryDetails('SENT_TO_REVIEW', 'sent the document to Camila Mendes for review'),
    ).toBe('enviou o documento para revisão de Camila Mendes')
    expect(formatHistoryDetails('PUBLISHED', 'published the document')).toBe('')
  })
})
