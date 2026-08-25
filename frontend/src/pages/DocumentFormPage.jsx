import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileText, Save, UploadCloud } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '../components/ErrorState'
import { PageHeader } from '../components/PageHeader'
import { PageSkeleton } from '../components/Loading'
import { useToast } from '../components/Toast'
import { api } from '../services/api'

const baseSchema = z.object({
  title: z.string().min(3, 'Informe um título com ao menos 3 caracteres.'),
  description: z.string().max(3000),
  category: z.string().min(2, 'Selecione uma categoria.'),
  document_type: z.enum(['TEXT', 'PDF']),
  content: z.string().optional(),
  assigned_reviewer_id: z.string().optional(),
  change_summary: z.string().min(3, 'Descreva esta versão.'),
  file: z.any().optional(),
})

function formSchema(editing) {
  return baseSchema.superRefine((data, context) => {
    if (data.document_type === 'TEXT' && !data.content?.trim())
      context.addIssue({
        code: 'custom',
        path: ['content'],
        message: 'Escreva o conteúdo do documento.',
      })
    if (!editing && data.document_type === 'PDF' && !data.file?.length)
      context.addIssue({ code: 'custom', path: ['file'], message: 'Selecione um arquivo PDF.' })
  })
}

const categories = ['Compliance', 'Financeiro', 'Operações', 'Pessoas', 'Segurança', 'Tecnologia']

export function DocumentFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const usersQuery = useQuery({ queryKey: ['users'], queryFn: () => api('/users') })
  const documentQuery = useQuery({
    queryKey: ['document', id],
    queryFn: () => api(`/documents/${id}`),
    enabled: editing,
  })
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema(editing)),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      document_type: 'TEXT',
      content: '',
      assigned_reviewer_id: '',
      change_summary: 'Versão inicial',
    },
  })
  const type = watch('document_type')

  useEffect(() => {
    if (documentQuery.data) {
      reset({
        title: documentQuery.data.title,
        description: documentQuery.data.description,
        category: documentQuery.data.category,
        document_type: documentQuery.data.document_type,
        content: documentQuery.data.current_content || '',
        assigned_reviewer_id: documentQuery.data.reviewer?.id || '',
        change_summary: 'Atualização desta versão',
      })
    }
  }, [documentQuery.data, reset])

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (editing) {
        await api(`/documents/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: values.title,
            description: values.description,
            category: values.category,
            assigned_reviewer_id: values.assigned_reviewer_id || null,
          }),
        })
        const originalContent = documentQuery.data.current_content || ''
        if (values.document_type === 'TEXT' && values.content !== originalContent) {
          await api(`/documents/${id}/versions`, {
            method: 'POST',
            body: JSON.stringify({
              content: values.content,
              change_summary: values.change_summary,
            }),
          })
        }
        if (values.document_type === 'PDF' && values.file?.[0]) {
          const body = new FormData()
          body.append('file', values.file[0])
          body.append('change_summary', values.change_summary)
          await api(`/documents/${id}/versions/upload`, { method: 'POST', body })
        }
        return { id }
      }
      if (values.document_type === 'PDF') {
        const body = new FormData()
        ;['title', 'description', 'category', 'assigned_reviewer_id', 'change_summary'].forEach(
          (key) => body.append(key, values[key] || ''),
        )
        body.append('file', values.file[0])
        return api('/documents/upload', { method: 'POST', body })
      }
      return api('/documents', {
        method: 'POST',
        body: JSON.stringify({
          ...values,
          file: undefined,
          assigned_reviewer_id: values.assigned_reviewer_id || null,
        }),
      })
    },
    onSuccess: (document) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.removeQueries({ queryKey: ['document', document.id] })
      toast(editing ? 'Documento e versão atualizados.' : 'Documento criado como rascunho.')
      navigate(`/documents/${document.id}`)
    },
    onError: (error) => toast(error.message, 'error'),
  })

  if (editing && documentQuery.isLoading) return <PageSkeleton />
  if (editing && documentQuery.isError) return <ErrorState message={documentQuery.error.message} />

  return (
    <>
      <PageHeader
        eyebrow={`Documentos / ${editing ? 'Editar' : 'Novo'}`}
        title={editing ? 'Editar documento' : 'Criar documento'}
        description={
          editing
            ? 'Atualize os metadados e registre uma nova versão quando o conteúdo mudar.'
            : 'O documento será salvo como rascunho. Nada será enviado para revisão automaticamente.'
        }
        actions={
          <Link to={editing ? `/documents/${id}` : '/documents'} className="button-secondary">
            <ArrowLeft size={16} /> Voltar
          </Link>
        }
      />
      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="grid gap-5 xl:grid-cols-[1fr_340px]"
      >
        <section className="card p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="title">
                Título
              </label>
              <input
                id="title"
                className="input"
                placeholder="Ex.: Política de Segurança da Informação"
                {...register('title')}
              />
              {errors.title && (
                <p className="mt-1.5 text-xs text-rose-300">{errors.title.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="category">
                Categoria
              </label>
              <select id="category" className="input" {...register('category')}>
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1.5 text-xs text-rose-300">{errors.category.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="reviewer">
                Revisor
              </label>
              <select id="reviewer" className="input" {...register('assigned_reviewer_id')}>
                <option value="">Selecionar depois</option>
                {usersQuery.data?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">
                Descrição
              </label>
              <textarea
                id="description"
                rows="3"
                className="input py-3"
                placeholder="Contexto e objetivo do documento"
                {...register('description')}
              />
            </div>
          </div>
          {!editing && (
            <div className="mt-6">
              <span className="label">Tipo de conteúdo</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['TEXT', FileText, 'Documento textual', 'Edite e compare o conteúdo no DocFlow.'],
                  ['PDF', UploadCloud, 'Arquivo PDF', 'Envie um PDF de até 10 MB.'],
                ].map(([value, Icon, label, description]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${type === value ? 'border-accent/50 bg-accent/10' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'}`}
                  >
                    <input
                      type="radio"
                      value={value}
                      className="sr-only"
                      {...register('document_type')}
                    />
                    <Icon size={19} className={type === value ? 'text-accent' : 'text-slate-500'} />
                    <span className="mt-3 block text-sm font-semibold text-slate-200">{label}</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-600">
                      {description}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="mt-6">
            {type === 'TEXT' ? (
              <>
                <label className="label" htmlFor="content">
                  Conteúdo
                </label>
                <textarea
                  id="content"
                  rows="16"
                  className="input py-4 font-mono text-[13px] leading-6"
                  placeholder="Escreva o documento…"
                  {...register('content')}
                />
                {errors.content && (
                  <p className="mt-1.5 text-xs text-rose-300">{errors.content.message}</p>
                )}
              </>
            ) : (
              <>
                <label className="label" htmlFor="file">
                  Arquivo PDF{' '}
                  {editing && (
                    <span className="font-normal text-slate-600">
                      (opcional se não houver nova versão)
                    </span>
                  )}
                </label>
                <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center hover:border-accent/40 hover:bg-accent/5">
                  <UploadCloud size={26} className="mb-3 text-accent" />
                  <span className="text-sm font-medium text-slate-300">Selecione um PDF</span>
                  <span className="mt-1 text-xs text-slate-600">
                    application/pdf · máximo 10 MB
                  </span>
                  <input
                    id="file"
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    {...register('file')}
                  />
                </label>
                {errors.file && (
                  <p className="mt-1.5 text-xs text-rose-300">{errors.file.message}</p>
                )}
              </>
            )}
          </div>
        </section>
        <aside className="space-y-5">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white">Sobre esta versão</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              O resumo entra no histórico e ajuda revisores a entender o que mudou.
            </p>
            <label className="label mt-4" htmlFor="summary">
              Resumo das alterações
            </label>
            <textarea
              id="summary"
              rows="4"
              className="input py-3"
              placeholder="Ex.: Ajuste nos prazos e responsabilidades"
              {...register('change_summary')}
            />
            {errors.change_summary && (
              <p className="mt-1.5 text-xs text-rose-300">{errors.change_summary.message}</p>
            )}
          </div>
          <div className="card p-5">
            <p className="text-xs leading-5 text-slate-500">
              Salvar não envia o documento para revisão. Você poderá conferir o resultado antes de
              avançar no fluxo.
            </p>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="button-primary mt-4 w-full"
            >
              <Save size={16} />{' '}
              {mutation.isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar rascunho'}
            </button>
          </div>
        </aside>
      </form>
    </>
  )
}
