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
