export const STATUS = {
  DRAFT: { label: 'Rascunho', tone: 'slate' },
  IN_REVIEW: { label: 'Em revisão', tone: 'blue' },
  CHANGES_REQUESTED: { label: 'Ajustes solicitados', tone: 'amber' },
  APPROVED: { label: 'Aprovado', tone: 'emerald' },
  PUBLISHED: { label: 'Publicado', tone: 'violet' },
  ARCHIVED: { label: 'Arquivado', tone: 'slate' },
}

export const ACTIONS = {
  DOCUMENT_CREATED: 'criou o documento',
  VERSION_CREATED: 'criou uma nova versão',
  SENT_TO_REVIEW: 'enviou para revisão',
  COMMENT_ADDED: 'adicionou um comentário',
  CHANGES_REQUESTED: 'solicitou ajustes',
  APPROVED: 'aprovou o documento',
  PUBLISHED: 'publicou o documento',
  ARCHIVED: 'arquivou o documento',
}

const LEGACY_DETAILS = {
  'created the document': '',
  'approved the document': '',
  'published the document': '',
  'added a review comment': '',
  'requested clearer ownership and completion deadlines':
    'solicitou responsáveis e prazos de conclusão mais claros',
}

export function formatHistoryDetails(action, details = '') {
  if (!details || details === ACTIONS[action]) return ''
  if (details in LEGACY_DETAILS) return LEGACY_DETAILS[details]
  const version = details.match(/^published version (v\d+\.\d+)$/)
  if (version) return `criou a versão ${version[1]}`
  const reviewer = details.match(/^sent the document to (.+) for review$/)
  if (reviewer) return `enviou o documento para revisão de ${reviewer[1]}`
  const changes = details.match(/^requested changes: (.+)$/)
  if (changes) return `solicitou ajustes: ${changes[1]}`
  return details
}

export function formatDate(value, withTime = false) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(new Date(value))
}

export function initials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
