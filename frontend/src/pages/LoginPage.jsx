import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '../components/Logo'
import { useAuth } from '../features/auth/AuthContext'

const schema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres.'),
})

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: 'admin@docflow.demo', password: 'DocFlowDemo2026!' },
  })

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function onSubmit(values) {
    setServerError('')
    try {
      await login(values)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (error) {
      setServerError(error.message)
    }
  }

  function fillDemo(email) {
    setValue('email', email)
    setValue('password', 'DocFlowDemo2026!')
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative hidden overflow-hidden border-r border-white/[0.06] p-14 lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(124,108,255,0.2),transparent_28rem)]" />
        <div className="relative z-10">
          <Logo />
        </div>
        <div className="relative z-10 my-auto max-w-xl">
          <p className="eyebrow mb-5">Documentos sob controle</p>
          <h1 className="font-['Manrope'] text-5xl font-bold leading-[1.08] tracking-[-0.05em] text-white xl:text-6xl">
            Uma única versão.
            <br />
            Uma história completa.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-500">
            Centralize revisões, aprovações e versões sem perder o contexto de cada decisão.
          </p>
          <div className="mt-10 grid max-w-lg gap-3 sm:grid-cols-2">
            {[
              'Workflow auditável',
              'Isolamento por empresa',
              'Revisão assistida por IA',
              'Versões preservadas',
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-slate-400">
                <CheckCircle2 size={15} className="text-accent" /> {feature}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-700">
          <ShieldCheck size={14} /> Ambiente seguro e multi-tenant
        </div>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>
          <p className="eyebrow mb-3">Bem-vindo de volta</p>
          <h2 className="font-['Manrope'] text-3xl font-bold tracking-[-0.04em] text-white">
            Acesse seu workspace
          </h2>
          <p className="mt-2 text-sm text-slate-500">Continue de onde sua equipe parou.</p>
          <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="label" htmlFor="email">
                E-mail corporativo
              </label>
              <input
                id="email"
                type="email"
                className="input"
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-300">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="input pr-11"
                  autoComplete="current-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-300">{errors.password.message}</p>
              )}
            </div>
            {serverError && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/15 bg-rose-400/10 px-4 py-3 text-sm text-rose-200"
              >
                {serverError}
              </div>
            )}
            <button type="submit" disabled={isSubmitting} className="button-primary w-full">
              {isSubmitting ? (
                'Entrando…'
              ) : (
                <>
                  Entrar <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
          <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <LockKeyhole size={14} /> Acessos de demonstração
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => fillDemo('admin@docflow.demo')}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left hover:bg-white/[0.05]"
              >
                <span className="block text-xs font-semibold text-slate-300">Administrador</span>
                <span className="mt-1 block truncate text-[10px] text-slate-600">
                  admin@docflow.demo
                </span>
              </button>
              <button
                onClick={() => fillDemo('collaborator@docflow.demo')}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left hover:bg-white/[0.05]"
              >
                <span className="block text-xs font-semibold text-slate-300">Colaborador</span>
                <span className="mt-1 block truncate text-[10px] text-slate-600">
                  collaborator@docflow.demo
                </span>
              </button>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  )
}
