import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../App'
import { ToastProvider } from '../components/Toast'
import { AuthProvider } from '../features/auth/AuthContext'

export const adminUser = {
  id: 'admin-1',
  name: 'Ana Ribeiro',
  email: 'admin@docflow.demo',
  role: 'ADMIN',
}

export function authenticatedSession(user = adminUser) {
  localStorage.setItem(
    'docflow-session',
    JSON.stringify({ access_token: 'valid-token', refresh_token: 'refresh-token', user }),
  )
}

export function jsonResponse(data, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

export function renderApp(path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

export const sampleDocument = {
  id: 'document-1',
  title: 'Política de Segurança da Informação',
  description: 'Diretrizes corporativas para proteção de dados.',
  category: 'Segurança',
  document_type: 'TEXT',
  status: 'IN_REVIEW',
  current_version: 1,
  version_label: 'v1.0',
  author: adminUser,
  reviewer: {
    id: 'collaborator-1',
    name: 'Bruno Costa',
    email: 'collaborator@docflow.demo',
    role: 'COLLABORATOR',
  },
  created_at: '2026-08-20T10:00:00Z',
  updated_at: '2026-08-21T10:00:00Z',
  ai_summary: null,
  current_content: 'Acesso a sistemas exige autenticação individual e MFA.',
  current_file_name: null,
  versions: [
    {
      id: 'version-1',
      version_number: 1,
      label: 'v1.0',
      content: 'Acesso a sistemas exige autenticação individual e MFA.',
      original_filename: null,
      mime_type: null,
      file_size: null,
      created_by: 'admin-1',
      change_summary: 'Versão inicial',
      created_at: '2026-08-20T10:00:00Z',
    },
  ],
  permissions: {
    edit: false,
    submit: false,
    review: true,
    publish: false,
    archive: true,
    comment: true,
  },
}
