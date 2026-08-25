import { FileSearch } from 'lucide-react'

export function EmptyState({ title = 'Nada por aqui', description, action }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-500">
        <FileSearch size={22} />
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
