import { ArrowRight, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '../utils/format'
import { Avatar } from './Avatar'
import { EmptyState } from './EmptyState'
import { StatusBadge } from './StatusBadge'

export function DocumentTable({ documents, compact = false }) {
  if (!documents?.length) {
    return (
      <EmptyState
        title="Nenhum documento encontrado"
        description="Ajuste os filtros ou crie o primeiro documento."
      />
    )
  }
  return (
    <>
      <div className="divide-y divide-white/[0.06] xl:hidden">
        {documents.map((document) => (
          <Link
            key={document.id}
            to={`/documents/${document.id}`}
            className="block p-4 transition hover:bg-white/[0.025]"
          >
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-400">
                <FileText size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium leading-5 text-slate-200">
                    {document.title}
                  </span>
                  <StatusBadge status={document.status} />
                </span>
                <span className="mt-1 block truncate text-xs text-slate-600">
                  {document.description}
                </span>
                <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span>{document.category}</span>
                  <span>{document.version_label}</span>
                  <span>{formatDate(document.updated_at)}</span>
                </span>
                {!compact && (
                  <span className="mt-2 block truncate text-[11px] text-slate-600">
                    {document.author.name}
                    {document.reviewer ? ` · ${document.reviewer.name}` : ' · sem revisor'}
                  </span>
                )}
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="custom-scrollbar hidden overflow-x-auto xl:block">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="border-b border-white/[0.07] text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              <th className="px-5 py-3.5">Documento</th>
              {!compact && <th className="px-4 py-3.5">Categoria</th>}
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Versão</th>
              {!compact && <th className="px-4 py-3.5">Responsáveis</th>}
              <th className="px-4 py-3.5">Atualizado</th>
              <th className="w-12 px-4 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {documents.map((document) => (
              <tr
                key={document.id}
                className="group border-b border-white/[0.05] last:border-0 hover:bg-white/[0.025]"
              >
                <td className="px-5 py-4">
                  <Link to={`/documents/${document.id}`} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-slate-400 group-hover:text-accent">
                      <FileText size={17} />
                    </span>
                    <span>
                      <span className="block max-w-[300px] truncate text-sm font-medium text-slate-200 group-hover:text-white">
                        {document.title}
                      </span>
                      <span className="mt-0.5 block max-w-[300px] truncate text-xs text-slate-600">
                        {document.description}
                      </span>
                    </span>
                  </Link>
                </td>
                {!compact && (
                  <td className="px-4 py-4 text-sm text-slate-400">{document.category}</td>
                )}
                <td className="px-4 py-4">
                  <StatusBadge status={document.status} />
                </td>
                <td className="px-4 py-4 text-sm font-medium text-slate-400">
                  {document.version_label}
                </td>
                {!compact && (
                  <td className="px-4 py-4">
                    <div className="flex -space-x-2">
                      <Avatar name={document.author.name} size="sm" />
                      {document.reviewer && <Avatar name={document.reviewer.name} size="sm" />}
                    </div>
                  </td>
                )}
                <td className="px-4 py-4 text-xs text-slate-500">
                  {formatDate(document.updated_at)}
                </td>
                <td className="px-4 py-4">
                  <Link
                    aria-label={`Abrir ${document.title}`}
                    to={`/documents/${document.id}`}
                    className="text-slate-600 transition group-hover:text-white"
                  >
                    <ArrowRight size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
