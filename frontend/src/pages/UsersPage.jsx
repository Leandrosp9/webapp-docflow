import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, ShieldCheck, UserRoundPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { Avatar } from '../components/Avatar'
import { ErrorState } from '../components/ErrorState'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { Skeleton } from '../components/Loading'
import { useToast } from '../components/Toast'
import { useAuth } from '../features/auth/AuthContext'
import { api } from '../services/api'
import { formatDate } from '../utils/format'

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome completo.'),
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'Use ao menos 8 caracteres.'),
  role: z.enum(['ADMIN', 'COLLABORATOR']),
})

export function UsersPage() {
  const [open, setOpen] = useState(false)
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['users'], queryFn: () => api('/users') })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', role: 'COLLABORATOR' },
  })
  const mutation = useMutation({
    mutationFn: (values) => api('/users', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      reset()
      setOpen(false)
      toast('Usuário cadastrado com sucesso.')
    },
    onError: (error) => toast(error.message, 'error'),
  })
  if (currentUser?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />
  return (
    <>
      <PageHeader
        eyebrow="Admin / Usuários"
        title="Pessoas e acessos"
        description="Gerencie quem pode criar, revisar e aprovar documentos na NovaTech Solutions."
        actions={
          <button onClick={() => setOpen(true)} className="button-primary">
            <Plus size={16} /> Cadastrar usuário
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <Users className="text-accent" size={18} />
          <p className="mt-4 text-2xl font-bold text-white">{query.data?.length ?? '—'}</p>
          <p className="mt-1 text-xs text-slate-500">Pessoas ativas</p>
        </div>
        <div className="card p-5">
          <ShieldCheck className="text-emerald-300" size={18} />
          <p className="mt-4 text-2xl font-bold text-white">
            {query.data?.filter((user) => user.role === 'ADMIN').length ?? '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Administradores</p>
        </div>
        <div className="card p-5">
          <UserRoundPlus className="text-cyan-300" size={18} />
          <p className="mt-4 text-2xl font-bold text-white">
            {query.data?.filter((user) => user.role === 'COLLABORATOR').length ?? '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Colaboradores</p>
        </div>
      </div>
      <section className="card mt-5 overflow-hidden">
        {query.isLoading && (
          <div className="space-y-2 p-5">
            {[1, 2, 3, 4].map((item) => (
              <Skeleton key={item} className="h-16" />
            ))}
          </div>
        )}
        {query.isError && <ErrorState message={query.error.message} />}
        {query.data && (
          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-600">
                  <th className="px-5 py-4">Pessoa</th>
                  <th className="px-5 py-4">Perfil</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Desde</th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((user) => (
                  <tr key={user.id} className="border-b border-white/[0.05] last:border-0">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} />
                        <div>
                          <p className="text-sm font-medium text-slate-200">{user.name}</p>
                          <p className="text-xs text-slate-600">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
                        {user.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-emerald-300">● Ativo</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cadastrar usuário"
        description="A pessoa será criada dentro da empresa atual."
      >
        <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Nome completo
            </label>
            <input id="name" className="input" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-rose-300">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="new-email">
              E-mail
            </label>
            <input id="new-email" type="email" className="input" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="new-password">
              Senha temporária
            </label>
            <input id="new-password" type="password" className="input" {...register('password')} />
            {errors.password && (
              <p className="mt-1 text-xs text-rose-300">{errors.password.message}</p>
            )}
          </div>
          <div>
            <label className="label" htmlFor="role">
              Perfil
            </label>
            <select id="role" className="input" {...register('role')}>
              <option value="COLLABORATOR">Colaborador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="button-secondary" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending} className="button-primary">
              {mutation.isPending ? 'Cadastrando…' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
