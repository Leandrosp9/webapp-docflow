import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileStack,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActivityTimeline } from '../components/ActivityTimeline'
import { DocumentTable } from '../components/DocumentTable'
import { EmptyState } from '../components/EmptyState'
import { ErrorState } from '../components/ErrorState'
import { PageHeader } from '../components/PageHeader'
import { PageSkeleton } from '../components/Loading'
import { api } from '../services/api'
import { STATUS } from '../utils/format'

const metrics = [
  {
    key: 'total',
    label: 'Documentos totais',
    icon: FileStack,
    color: 'text-violet-300',
    bg: 'bg-violet-400/10',
  },
  {
    key: 'in_review',
    label: 'Em revisão',
    icon: Clock3,
    color: 'text-cyan-300',
    bg: 'bg-cyan-400/10',
  },
  {
    key: 'changes_requested',
    label: 'Aguardando ajustes',
    icon: RotateCcw,
    color: 'text-amber-300',
    bg: 'bg-amber-400/10',
  },
  {
    key: 'approved',
    label: 'Aprovados',
    icon: CheckCircle2,
    color: 'text-emerald-300',
    bg: 'bg-emerald-400/10',
  },
]

export function DashboardPage() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: () => api('/documents/dashboard') })
  if (query.isLoading) return <PageSkeleton />
  if (query.isError) return <ErrorState message={query.error.message} onRetry={query.refetch} />
  const data = query.data
  const maxCount = Math.max(1, ...Object.values(data.by_status))

  return (
    <>
      <PageHeader
        eyebrow="Workspace / Visão geral"
        title="O trabalho está fluindo."
        description="Acompanhe revisões, ajustes e publicações da NovaTech Solutions."
        actions={
          <Link to="/documents/new" className="button-primary">
            <Plus size={16} /> Criar documento
          </Link>
        }
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ key, label, icon: Icon, color, bg }, index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="card p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-3 font-['Manrope'] text-3xl font-bold tracking-tight text-white">
                  {data.metrics[key]}
                </p>
              </div>
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${bg} ${color}`}>
                <Icon size={18} />
              </span>
            </div>
          </motion.div>
        ))}
      </section>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_0.85fr]">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Documentos recentes</h2>
              <p className="mt-0.5 text-xs text-slate-600">Últimas movimentações do workspace</p>
            </div>
            <Link
              to="/documents"
              className="flex items-center gap-1 text-xs font-medium text-accent hover:text-violet-300"
            >
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>
          <DocumentTable documents={data.recent_documents} compact />
        </div>
        <div className="card p-5">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <Sparkles size={16} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-white">Por status</h2>
              <p className="text-xs text-slate-600">Distribuição real do acervo</p>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(data.by_status).map(([status, count]) => (
              <div key={status}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-slate-400">{STATUS[status]?.label}</span>
                  <span className="font-semibold text-slate-300">{count}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxCount) * 100}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-accent to-cyan"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-5 text-sm font-semibold text-white">Pendentes para minha revisão</h2>
          {data.pending_reviews.length ? (
            <DocumentTable documents={data.pending_reviews} compact />
          ) : (
            <EmptyState
              title="Fila de revisão em dia"
              description="Você não tem documentos aguardando sua análise."
            />
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-5 text-sm font-semibold text-white">Atividades recentes</h2>
          {data.recent_activity.length ? (
            <ActivityTimeline items={data.recent_activity} compact />
          ) : (
            <EmptyState title="Sem atividades recentes" />
          )}
        </div>
      </section>
    </>
  )
}
