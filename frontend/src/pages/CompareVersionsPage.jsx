import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Bot, Minus, Plus, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PageHeader } from '../components/PageHeader'
import { PageSkeleton } from '../components/Loading'
import { useToast } from '../components/Toast'
import { api } from '../services/api'

export function CompareVersionsPage() {
  const { id } = useParams()
  const toast = useToast()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const documentQuery = useQuery({
    queryKey: ['document', id],
    queryFn: () => api(`/documents/${id}`),
  })
  useEffect(() => {
    const versions = documentQuery.data?.versions
    if (versions?.length >= 2 && !from) {
      setTo(versions[0].id)
      setFrom(versions[1].id)
    }
  }, [documentQuery.data, from])
  const compareMutation = useMutation({
    mutationFn: (explainWithAi = false) =>
      api(`/documents/${id}/compare`, {
        method: 'POST',
        body: JSON.stringify({
          from_version_id: from,
          to_version_id: to,
          explain_with_ai: explainWithAi,
        }),
      }),
    onError: (error) => toast(error.message, 'error'),
  })
  useEffect(() => {
    if (from && to && from !== to) compareMutation.mutate(false)
    // Re-run only when the selected versions change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])
  if (documentQuery.isLoading) return <PageSkeleton />
  if (documentQuery.isError) return <ErrorState message={documentQuery.error.message} />
  const document = documentQuery.data
  if (document.versions.length < 2)
    return (
      <EmptyState
        title="Comparação indisponível"
        description="Crie uma nova versão antes de comparar alterações."
        action={
          <Link to={`/documents/${id}`} className="button-secondary">
            Voltar
          </Link>
        }
      />
    )
  const result = compareMutation.data

  return (
    <>
      <PageHeader
        eyebrow="Documentos / Comparar"
        title="Comparar versões"
        description={document.title}
        actions={
          <Link to={`/documents/${id}`} className="button-secondary">
            <ArrowLeft size={15} /> Voltar ao documento
          </Link>
        }
      />
      <section className="card mb-5 p-4">
        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto]">
          <div>
            <label className="label" htmlFor="from">
              Versão anterior
            </label>
            <select
              id="from"
              className="input"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            >
              {document.versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label} — {version.change_summary}
                </option>
              ))}
            </select>
          </div>
          <span className="pb-3 text-xs font-semibold text-slate-600">VS</span>
          <div>
            <label className="label" htmlFor="to">
              Versão mais recente
            </label>
            <select
              id="to"
              className="input"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            >
              {document.versions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label} — {version.change_summary}
                </option>
              ))}
            </select>
          </div>
          <button
            disabled={!result || compareMutation.isPending}
            onClick={() => compareMutation.mutate(true)}
            className="button-primary"
          >
            <Sparkles size={15} /> Comparar com IA
          </button>
        </div>
        {from === to && (
          <p className="mt-3 text-xs text-amber-300">Selecione versões diferentes.</p>
        )}
      </section>
      {compareMutation.isPending && !result && <PageSkeleton />}
      {result && (
        <>
          <section className="grid overflow-hidden rounded-2xl border border-white/[0.07] bg-panel/80 lg:grid-cols-2">
            <div className="border-b border-white/[0.07] lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-rose-400/[0.035] px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Minus size={15} className="text-rose-300" /> {result.from.label}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-600">Antes</span>
              </div>
              <pre className="custom-scrollbar min-h-96 whitespace-pre-wrap p-6 font-sans text-sm leading-7 text-slate-400">
                {result.from_content}
              </pre>
            </div>
            <div>
              <div className="flex items-center justify-between border-b border-white/[0.06] bg-emerald-400/[0.035] px-5 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Plus size={15} className="text-emerald-300" /> {result.to.label}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-600">Depois</span>
              </div>
              <pre className="custom-scrollbar min-h-96 whitespace-pre-wrap p-6 font-sans text-sm leading-7 text-slate-300">
                {result.to_content}
              </pre>
            </div>
          </section>
          <section className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="card border-emerald-400/10 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
                <Plus size={15} /> Trechos adicionados
              </h2>
              <div className="mt-4 space-y-2">
                {result.added.length ? (
                  result.added.map((line, index) => (
                    <p
                      key={index}
                      className="rounded-lg bg-emerald-400/[0.06] px-3 py-2 text-xs leading-5 text-emerald-100/70"
                    >
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-slate-600">Nenhuma linha adicionada.</p>
                )}
              </div>
            </div>
            <div className="card border-rose-400/10 p-5">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-200">
                <Minus size={15} /> Trechos removidos
              </h2>
              <div className="mt-4 space-y-2">
                {result.removed.length ? (
                  result.removed.map((line, index) => (
                    <p
                      key={index}
                      className="rounded-lg bg-rose-400/[0.06] px-3 py-2 text-xs leading-5 text-rose-100/70"
                    >
                      {line}
                    </p>
                  ))
                ) : (
                  <p className="text-xs text-slate-600">Nenhuma linha removida.</p>
                )}
              </div>
            </div>
          </section>
          {result.ai_explanation && (
            <section className="card mt-5 border-accent/15 bg-gradient-to-br from-accent/[0.08] to-transparent p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <Bot size={17} className="text-accent" /> Resumo das alterações com IA
              </h2>
              <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                {result.ai_explanation}
              </div>
            </section>
          )}
        </>
      )}
      {!result && !compareMutation.isPending && <EmptyState title="Selecione duas versões" />}
    </>
  )
}
