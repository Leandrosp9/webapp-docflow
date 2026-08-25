import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArrowLeft,
  Bot,
  Check,
  FileDiff,
  FileText,
  History,
  MessageSquareText,
  Pencil,
  RotateCcw,
  Send,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { Avatar } from '../components/Avatar'
import { ConfirmDialog, Modal } from '../components/Modal'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PageSkeleton } from '../components/Loading'
import { PdfViewer } from '../components/PdfViewer'
import { StatusBadge } from '../components/StatusBadge'
import { useToast } from '../components/Toast'
import { api } from '../services/api'
import { formatDate } from '../utils/format'

export function DocumentDetailPage() {
  const { id } = useParams()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState(null)
  const [comment, setComment] = useState('')
  const [reviewComment, setReviewComment] = useState('')
  const [aiResult, setAiResult] = useState('')
  const [aiTitle, setAiTitle] = useState('')

  const documentQuery = useQuery({
    queryKey: ['document', id],
    queryFn: () => api(`/documents/${id}`),
  })
  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api(`/documents/${id}/comments`),
  })
  const historyQuery = useQuery({
    queryKey: ['history', id],
    queryFn: () => api(`/documents/${id}/history`),
  })
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['document', id] })
    queryClient.invalidateQueries({ queryKey: ['history', id] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['documents'] })
  }
  const actionMutation = useMutation({
    mutationFn: ({ path, body }) =>
      api(path, { method: 'POST', ...(body ? { body: JSON.stringify(body) } : {}) }),
    onSuccess: (_, variables) => {
      invalidate()
      setDialog(null)
      setReviewComment('')
      toast(variables.success)
    },
    onError: (error) => toast(error.message, 'error'),
  })
  const commentMutation = useMutation({
    mutationFn: () =>
      api(`/documents/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ message: comment }),
      }),
    onSuccess: () => {
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
      queryClient.invalidateQueries({ queryKey: ['history', id] })
      toast('Comentário adicionado.')
    },
    onError: (error) => toast(error.message, 'error'),
  })
  const aiMutation = useMutation({
    mutationFn: ({ kind }) =>
      api(`/ai/documents/${id}/${kind}`, { method: 'POST', body: JSON.stringify({}) }),
    onSuccess: (result, variables) => {
      setAiTitle(variables.kind === 'review' ? 'Revisão assistida por IA' : 'Resumo gerado por IA')
      setAiResult(result.result)
      if (variables.kind === 'summary') invalidate()
    },
    onError: (error) => toast(error.message, 'error'),
  })

  if (documentQuery.isLoading) return <PageSkeleton />
  if (documentQuery.isError)
    return <ErrorState message={documentQuery.error.message} onRetry={documentQuery.refetch} />
  const document = documentQuery.data
  const currentVersion = document.versions.find(
    (version) => version.version_number === document.current_version,
  )
  const permissions = document.permissions

  function runAction(path, success, body) {
    actionMutation.mutate({ path, success, body })
  }

  return (
    <>
      <div className="mb-5">
        <Link
          to="/documents"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-white"
        >
          <ArrowLeft size={14} /> Biblioteca de documentos
        </Link>
      </div>
      <header className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={document.status} />
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs font-medium text-slate-400">
              {document.version_label}
            </span>
            <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-xs text-slate-500">
              {document.category}
            </span>
          </div>
          <h1 className="page-title max-w-4xl">{document.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{document.description}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {permissions.edit && (
            <Link to={`/documents/${id}/edit`} className="button-secondary">
              <Pencil size={15} /> Editar
            </Link>
          )}
          {permissions.submit && (
            <button onClick={() => setDialog('submit')} className="button-primary">
              <Send size={15} /> Enviar para revisão
            </button>
          )}
          {permissions.review && (
            <>
              <button
                onClick={() => setDialog('changes')}
                className="button-secondary text-amber-200"
              >
                <RotateCcw size={15} /> Solicitar ajustes
              </button>
              <button onClick={() => setDialog('approve')} className="button-primary">
                <Check size={15} /> Aprovar
              </button>
            </>
          )}
          {permissions.publish && (
            <button onClick={() => setDialog('publish')} className="button-primary">
              <Sparkles size={15} /> Publicar
            </button>
          )}
        </div>
      </header>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]">
        <div className="space-y-5">
          {document.ai_summary && (
            <section className="card border-accent/15 bg-gradient-to-br from-accent/[0.08] to-transparent p-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent">
                <Sparkles size={14} /> Resumo assistido por IA
              </div>
              <p className="text-sm leading-6 text-slate-300">{document.ai_summary}</p>
            </section>
          )}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-accent" />
                <h2 className="text-sm font-semibold text-white">Conteúdo oficial</h2>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={aiMutation.isPending}
                  onClick={() => aiMutation.mutate({ kind: 'summary' })}
                  className="button-secondary !min-h-8 !px-3 !py-1 text-xs"
                >
                  <Sparkles size={13} /> Gerar resumo
                </button>
                <button
                  disabled={aiMutation.isPending}
                  onClick={() => aiMutation.mutate({ kind: 'review' })}
                  className="button-secondary !min-h-8 !px-3 !py-1 text-xs"
                >
                  <Bot size={13} /> Revisar com IA
                </button>
              </div>
            </div>
            {document.document_type === 'PDF' ? (
              <PdfViewer documentId={id} version={currentVersion} />
            ) : (
              <article className="min-h-80 whitespace-pre-wrap px-6 py-8 text-[14px] leading-7 text-slate-300 sm:px-10">
                {document.current_content}
              </article>
            )}
          </section>
          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Comentários</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Discussão contextual durante a revisão
                </p>
              </div>
              <MessageSquareText size={17} className="text-slate-600" />
            </div>
            {commentsQuery.data?.length ? (
              <div className="space-y-4">
                {commentsQuery.data.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <Avatar name={item.user.name} />
                    <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-white/[0.07] bg-white/[0.025] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-300">
                          {item.user.name}
                        </span>
                        <time className="text-[10px] text-slate-600">
                          {formatDate(item.created_at, true)}
                        </time>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{item.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Nenhum comentário"
                description="A conversa de revisão aparecerá aqui."
              />
            )}
            {permissions.comment && (
              <div className="mt-5 flex gap-3 border-t border-white/[0.06] pt-5">
                <textarea
                  aria-label="Novo comentário"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="input min-h-20 py-3"
                  placeholder="Adicione uma observação objetiva…"
                />
                <button
                  disabled={!comment.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate()}
                  className="button-primary self-end"
                >
                  <Send size={15} />
                  <span className="hidden sm:inline">Comentar</span>
                </button>
              </div>
            )}
          </section>
          <section className="card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Histórico recente</h2>
              <Link
                to={`/documents/${id}/history`}
                className="flex items-center gap-1 text-xs text-accent"
              >
                Histórico completo <History size={13} />
              </Link>
            </div>
            {historyQuery.data?.length ? (
              <ActivityTimeline items={historyQuery.data.slice(0, 5)} />
            ) : (
              <EmptyState />
            )}
          </section>
        </div>
        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
              Responsáveis
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={document.author.name} />
                <div>
                  <p className="text-xs font-medium text-slate-300">{document.author.name}</p>
                  <p className="text-[11px] text-slate-600">Autor</p>
                </div>
              </div>
              {document.reviewer ? (
                <div className="flex items-center gap-3">
                  <Avatar name={document.reviewer.name} />
                  <div>
                    <p className="text-xs font-medium text-slate-300">{document.reviewer.name}</p>
                    <p className="text-[11px] text-slate-600">Revisor atribuído</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-300">Revisor ainda não definido</p>
              )}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/[0.06] pt-5">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-700">Criado em</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(document.created_at)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-700">Atualizado</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(document.updated_at)}</p>
              </div>
            </div>
          </section>
          <section className="card overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Versões</h2>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {document.versions.map((version) => (
                <div key={version.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-white/[0.05] px-2 py-1 text-xs font-semibold text-slate-300">
                      {version.label}
                    </span>
                    <time className="text-[10px] text-slate-600">
                      {formatDate(version.created_at)}
                    </time>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{version.change_summary}</p>
                </div>
              ))}
            </div>
            {document.versions.length >= 2 && (
              <div className="border-t border-white/[0.06] p-3">
                <Link to={`/documents/${id}/compare`} className="button-secondary w-full">
                  <FileDiff size={15} /> Comparar versões
                </Link>
              </div>
            )}
          </section>
          {permissions.archive && (
            <button onClick={() => setDialog('archive')} className="button-danger w-full">
              <Archive size={15} /> Arquivar documento
            </button>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={dialog === 'submit'}
        onClose={() => setDialog(null)}
        title="Enviar para revisão?"
        description={`O documento será atribuído a ${document.reviewer?.name || 'um revisor'} e não poderá ser editado durante a análise.`}
        confirmLabel="Enviar agora"
        loading={actionMutation.isPending}
        onConfirm={() => runAction(`/documents/${id}/submit`, 'Documento enviado para revisão.')}
      />
      <ConfirmDialog
        open={dialog === 'approve'}
        onClose={() => setDialog(null)}
        title="Aprovar documento?"
        description="A decisão ficará registrada permanentemente no histórico."
        confirmLabel="Aprovar"
        loading={actionMutation.isPending}
        onConfirm={() =>
          runAction(`/documents/${id}/review`, 'Documento aprovado.', { decision: 'APPROVE' })
        }
      />
      <ConfirmDialog
        open={dialog === 'publish'}
        onClose={() => setDialog(null)}
        title="Publicar versão oficial?"
        description="Esta versão passará a ser a referência oficial da empresa."
        confirmLabel="Publicar"
        loading={actionMutation.isPending}
        onConfirm={() => runAction(`/documents/${id}/publish`, 'Documento publicado.')}
      />
      <ConfirmDialog
        open={dialog === 'archive'}
        onClose={() => setDialog(null)}
        title="Arquivar documento?"
        description="O item ficará preservado no histórico, mas sairá do fluxo ativo."
        confirmLabel="Arquivar"
        danger
        loading={actionMutation.isPending}
        onConfirm={() => runAction(`/documents/${id}/archive`, 'Documento arquivado.')}
      />
      <Modal
        open={dialog === 'changes'}
        onClose={() => setDialog(null)}
        title="Solicitar ajustes"
        description="Explique com clareza o que o autor precisa corrigir."
      >
        <label className="label" htmlFor="review-comment">
          Orientação para o autor
        </label>
        <textarea
          id="review-comment"
          className="input min-h-32 py-3"
          value={reviewComment}
          onChange={(event) => setReviewComment(event.target.value)}
          placeholder="Ex.: Especifique o responsável e o prazo da etapa 3."
        />
        <div className="mt-5 flex justify-end gap-2">
          <button className="button-secondary" onClick={() => setDialog(null)}>
            Cancelar
          </button>
          <button
            disabled={!reviewComment.trim() || actionMutation.isPending}
            className="button-primary"
            onClick={() =>
              runAction(`/documents/${id}/review`, 'Ajustes solicitados ao autor.', {
                decision: 'REQUEST_CHANGES',
                comment: reviewComment,
              })
            }
          >
            Solicitar ajustes
          </button>
        </div>
      </Modal>
      <Modal
        open={Boolean(aiResult)}
        onClose={() => setAiResult('')}
        title={aiTitle}
        description="Sugestões de apoio à decisão. O conteúdo não foi alterado automaticamente."
        size="lg"
      >
        <div className="whitespace-pre-wrap rounded-2xl border border-white/[0.07] bg-black/20 p-5 text-sm leading-7 text-slate-300">
          {aiResult}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
          <Bot size={13} /> Resultado gerado pelo Gemini. Revise antes de tomar decisões.
        </div>
      </Modal>
    </>
  )
}
