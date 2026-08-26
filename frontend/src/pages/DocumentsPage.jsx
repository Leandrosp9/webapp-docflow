import { useQuery } from '@tanstack/react-query'
import { Filter, Plus, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DocumentTable } from '../components/DocumentTable'
import { ErrorState } from '../components/ErrorState'
import { PageHeader } from '../components/PageHeader'
import { Skeleton } from '../components/Loading'
import { api } from '../services/api'
import { STATUS } from '../utils/format'

export function DocumentsPage() {
  const [filters, setFilters] = useState({ search: '', status: '', category: '', author: '' })
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => api('/users') })
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key === 'author' ? 'author_id' : key, value)
    })
    return params.toString()
  }, [filters])
  const documentsQuery = useQuery({
    queryKey: ['documents', filters],
    queryFn: () => api(`/documents?${queryString}`),
  })
  const categories = ['Compliance', 'Financeiro', 'Operações', 'Pessoas', 'Segurança', 'Tecnologia']
  const hasFilters = Object.values(filters).some(Boolean)

  function change(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  return (
    <>
      <PageHeader
        eyebrow="Workspace / Documentos"
        title="Biblioteca de documentos"
        description="Encontre a versão oficial, o responsável e o contexto de aprovação em um só lugar."
        actions={
          <Link to="/documents/new" className="button-primary">
            <Plus size={16} /> Novo documento
          </Link>
        }
      />
      <div className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_190px_auto]">
          <label className="relative md:col-span-2 xl:col-span-1">
            <span className="sr-only">Buscar por título</span>
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
            />
            <input
              className="input pl-10"
              placeholder="Buscar por título…"
              value={filters.search}
              onChange={(event) => change('search', event.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por status"
            className="input"
            value={filters.status}
            onChange={(event) => change('status', event.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS).map(([value, config]) => (
              <option key={value} value={value}>
                {config.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filtrar por categoria"
            className="input"
            value={filters.category}
            onChange={(event) => change('category', event.target.value)}
          >
            <option value="">Categorias</option>
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <select
            aria-label="Filtrar por autor"
            className="input"
            value={filters.author}
            onChange={(event) => change('author', event.target.value)}
          >
            <option value="">Todos os autores</option>
            {usersQuery.data?.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button
            className="button-secondary"
            disabled={!hasFilters}
            onClick={() => setFilters({ search: '', status: '', category: '', author: '' })}
          >
            {hasFilters ? <X size={15} /> : <Filter size={15} />} Limpar
          </button>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-300">
              {documentsQuery.data?.total ?? '—'}
            </span>{' '}
            documentos encontrados
          </p>
        </div>
        {documentsQuery.isLoading && (
          <div className="space-y-2 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <Skeleton key={item} className="h-14" />
            ))}
          </div>
        )}
        {documentsQuery.isError && (
          <ErrorState message={documentsQuery.error.message} onRetry={documentsQuery.refetch} />
        )}
        {documentsQuery.data && <DocumentTable documents={documentsQuery.data.items} />}
      </div>
    </>
  )
}
