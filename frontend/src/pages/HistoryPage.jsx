import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, History } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { ErrorState } from '../components/ErrorState'
import { PageHeader } from '../components/PageHeader'
import { PageSkeleton } from '../components/Loading'
import { api } from '../services/api'

export function HistoryPage() {
  const { id } = useParams()
  const documentQuery = useQuery({
    queryKey: ['document', id],
    queryFn: () => api(`/documents/${id}`),
  })
  const historyQuery = useQuery({
    queryKey: ['history', id],
    queryFn: () => api(`/documents/${id}/history`),
  })
  if (documentQuery.isLoading || historyQuery.isLoading) return <PageSkeleton />
  if (documentQuery.isError || historyQuery.isError)
    return <ErrorState message={(documentQuery.error || historyQuery.error).message} />
  return (
    <>
      <PageHeader
        eyebrow="Documentos / Histórico"
        title="Trilha de auditoria"
        description={`Registro completo e cronológico de “${documentQuery.data.title}”.`}
        actions={
          <Link to={`/documents/${id}`} className="button-secondary">
            <ArrowLeft size={15} /> Voltar ao documento
          </Link>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="card p-6 sm:p-8">
          <ActivityTimeline items={historyQuery.data} />
        </section>
        <aside className="card h-fit p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
            <History size={18} />
          </span>
          <h2 className="mt-4 text-sm font-semibold text-white">Histórico preservado</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Cada evento registra pessoa, data, ação e contexto. Versões antigas nunca são
            sobrescritas.
          </p>
          <button
            disabled
            title="Exportação está no roadmap"
            className="button-secondary mt-5 w-full"
          >
            <Download size={14} /> Exportar trilha
          </button>
        </aside>
      </div>
    </>
  )
}
