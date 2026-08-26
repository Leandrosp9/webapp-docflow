import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { Avatar } from '../components/Avatar'
import { ErrorState } from '../components/ErrorState'
import { ConfirmDialog, Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'
import { Skeleton } from '../components/Loading'
import { useToast } from '../components/Toast'
import { useAuth } from '../features/auth/AuthContext'
import { api } from '../services/api'
import { formatCpf, isValidCpf } from '../utils/cpf'
import { formatDate } from '../utils/format'

function userSchema(editing) {
  return z
    .object({
      name: z.string().trim().min(2, 'Informe o nome completo.'),
      email: z.string().email('Informe um e-mail válido.'),
      cpf: z.string().refine(isValidCpf, 'Informe um CPF válido.'),
      password: editing
        ? z.string().refine((value) => !value || value.length >= 8, 'Use ao menos 8 caracteres.')
        : z.string().min(8, 'Use ao menos 8 caracteres.'),
      password_confirmation: z.string(),
      role: z.enum(['ADMIN', 'COLLABORATOR']),
    })
    .superRefine((data, context) => {
      if (data.password !== data.password_confirmation) {
        context.addIssue({
          code: 'custom',
          path: ['password_confirmation'],
          message: 'As senhas não coincidem.',
        })
      }
    })
}

const emptyUser = {
  name: '',
  email: '',
  cpf: '',
  password: '',
  password_confirmation: '',
  role: 'COLLABORATOR',
}

function UserForm({ user, onClose, onSaved }) {
  const editing = Boolean(user)
  const toast = useToast()
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema(editing)),
    defaultValues: user
      ? {
          name: user.name,
          email: user.email,
          cpf: formatCpf(user.cpf),
          password: '',
          password_confirmation: '',
          role: user.role,
        }
      : emptyUser,
  })
  const mutation = useMutation({
    mutationFn: ({ password_confirmation: confirmation, ...values }) => {
      void confirmation
      const payload = { ...values, cpf: values.cpf.replace(/\D/g, '') }
      if (editing && !payload.password) delete payload.password
      return api(editing ? `/users/${user.id}` : '/users', {
        method: editing ? 'PATCH' : 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      toast(editing ? 'Usuário atualizado com sucesso.' : 'Usuário cadastrado com sucesso.')
      onSaved()
    },
    onError: (error) => toast(error.message, 'error'),
  })

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
      <div>
        <label className="label" htmlFor="user-name">
          Nome completo
        </label>
        <input id="user-name" className="input" autoComplete="name" {...register('name')} />
        {errors.name && <p className="mt-1 text-xs text-rose-300">{errors.name.message}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="user-email">
            E-mail
          </label>
          <input
            id="user-email"
            type="email"
            className="input"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-rose-300">{errors.email.message}</p>}
        </div>
        <div>
          <label className="label" htmlFor="user-cpf">
            CPF
          </label>
          <input
            id="user-cpf"
            inputMode="numeric"
            className="input"
            placeholder="000.000.000-00"
            {...register('cpf', {
              onChange: (event) => setValue('cpf', formatCpf(event.target.value)),
            })}
          />
          {errors.cpf && <p className="mt-1 text-xs text-rose-300">{errors.cpf.message}</p>}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="user-password">
            {editing ? 'Nova senha' : 'Senha temporária'}
          </label>
          <input
            id="user-password"
            type="password"
            className="input"
            autoComplete="new-password"
            {...register('password')}
          />
          {editing && (
            <p className="mt-1 text-[11px] text-slate-600">Deixe em branco para manter a senha.</p>
          )}
          {errors.password && (
            <p className="mt-1 text-xs text-rose-300">{errors.password.message}</p>
          )}
        </div>
        <div>
          <label className="label" htmlFor="user-password-confirmation">
            Repetir senha
          </label>
          <input
            id="user-password-confirmation"
            type="password"
            className="input"
            autoComplete="new-password"
            {...register('password_confirmation')}
          />
          {errors.password_confirmation && (
            <p className="mt-1 text-xs text-rose-300">{errors.password_confirmation.message}</p>
          )}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="user-role">
          Perfil
        </label>
        <select id="user-role" className="input" {...register('role')}>
          <option value="COLLABORATOR">Colaborador</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" className="button-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" disabled={mutation.isPending} className="button-primary">
          {editing ? <KeyRound size={16} /> : <Plus size={16} />}
          {mutation.isPending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar'}
        </button>
      </div>
    </form>
  )
}

function StatusBadge({ active }) {
  return (
    <span className={active ? 'text-emerald-300' : 'text-slate-500'}>
      ● {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

export function UsersPage() {
  const [formUser, setFormUser] = useState(undefined)
  const [confirm, setConfirm] = useState(null)
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['users'], queryFn: () => api('/users') })
  const closeForm = () => setFormUser(undefined)
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
    closeForm()
  }
  const statusMutation = useMutation({
    mutationFn: (user) =>
      api(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !user.is_active }),
      }),
    onSuccess: (user) => {
      toast(user.is_active ? 'Usuário reativado.' : 'Usuário inativado.')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setConfirm(null)
    },
    onError: (error) => toast(error.message, 'error'),
  })
  const deleteMutation = useMutation({
    mutationFn: (user) => api(`/users/${user.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast('Usuário excluído permanentemente.')
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setConfirm(null)
    },
    onError: (error) => {
      toast(
        error.code === 'USER_HAS_DOCUMENT_HISTORY'
          ? 'Este usuário possui histórico documental e deve ser inativado.'
          : error.message,
        'error',
      )
      setConfirm(null)
    },
  })
  if (currentUser?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />

  const actions = (user) => (
    <div className="flex items-center justify-end gap-1">
      <button
        aria-label={`Editar ${user.name}`}
        className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
        onClick={() => setFormUser(user)}
      >
        <Pencil size={16} />
      </button>
      {user.id !== currentUser.id && (
        <>
          <button
            aria-label={`${user.is_active ? 'Inativar' : 'Ativar'} ${user.name}`}
            className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
            onClick={() => setConfirm({ type: 'status', user })}
          >
            {user.is_active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
          </button>
          <button
            aria-label={`Excluir ${user.name}`}
            className="rounded-lg p-2 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300"
            onClick={() => setConfirm({ type: 'delete', user })}
          >
            <Trash2 size={16} />
          </button>
        </>
      )}
    </div>
  )

  return (
    <>
      <PageHeader
        eyebrow="Admin / Usuários"
        title="Pessoas e acessos"
        description="Gerencie perfis, credenciais e acessos da NovaTech Solutions."
        actions={
          <button onClick={() => setFormUser(null)} className="button-primary">
            <Plus size={16} /> Cadastrar usuário
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <Users className="text-accent" size={18} />
          <p className="mt-4 text-2xl font-bold text-white">
            {query.data?.filter((user) => user.is_active).length ?? '—'}
          </p>
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
          <>
            <div className="grid gap-3 p-4 lg:hidden">
              {query.data.map((user) => (
                <article
                  key={user.id}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
                >
                  <div className="flex items-start gap-3">
                    <Avatar name={user.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-200">{user.name}</p>
                      <p className="truncate text-xs text-slate-600">{user.email}</p>
                      <p className="mt-1 text-xs text-slate-500">CPF {formatCpf(user.cpf)}</p>
                    </div>
                    {actions(user)}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                    <span className="text-slate-500">
                      {user.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                    </span>
                    <StatusBadge active={user.is_active} />
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[820px] text-left">
                <thead>
                  <tr className="border-b border-white/[0.07] text-[11px] uppercase tracking-wider text-slate-600">
                    <th className="px-5 py-4">Pessoa</th>
                    <th className="px-5 py-4">CPF</th>
                    <th className="px-5 py-4">Perfil</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Desde</th>
                    <th className="px-5 py-4 text-right">Ações</th>
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
                      <td className="px-5 py-4 text-xs text-slate-500">{formatCpf(user.cpf)}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-slate-400">
                          {user.role === 'ADMIN' ? 'Administrador' : 'Colaborador'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <StatusBadge active={user.is_active} />
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-5 py-4">{actions(user)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
      <Modal
        open={formUser !== undefined}
        onClose={closeForm}
        title={formUser ? 'Editar usuário' : 'Cadastrar usuário'}
        description={
          formUser
            ? 'Atualize os dados ou defina uma nova senha.'
            : 'A pessoa será criada dentro da empresa atual.'
        }
        size="lg"
      >
        {formUser !== undefined && (
          <UserForm
            key={formUser?.id || 'new'}
            user={formUser}
            onClose={closeForm}
            onSaved={refresh}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm?.type === 'delete'
            ? 'Excluir usuário?'
            : confirm?.user?.is_active
              ? 'Inativar usuário?'
              : 'Reativar usuário?'
        }
        description={
          confirm?.type === 'delete'
            ? 'A exclusão só será permitida se não houver vínculos com documentos ou auditoria.'
            : confirm?.user?.is_active
              ? 'O acesso será interrompido imediatamente e os tokens de sessão serão revogados.'
              : 'A pessoa poderá entrar novamente com suas credenciais.'
        }
        confirmLabel={
          confirm?.type === 'delete'
            ? 'Excluir permanentemente'
            : confirm?.user?.is_active
              ? 'Inativar'
              : 'Reativar'
        }
        danger={confirm?.type === 'delete' || confirm?.user?.is_active}
        loading={statusMutation.isPending || deleteMutation.isPending}
        onClose={() => setConfirm(null)}
        onConfirm={() =>
          confirm?.type === 'delete'
            ? deleteMutation.mutate(confirm.user)
            : statusMutation.mutate(confirm.user)
        }
      />
    </>
  )
}
