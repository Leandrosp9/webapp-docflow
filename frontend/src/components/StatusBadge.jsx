import { Circle } from 'lucide-react'
import { STATUS } from '../utils/format'

const tones = {
  slate: 'border-slate-400/15 bg-slate-400/10 text-slate-300',
  blue: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  violet: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
}

export function StatusBadge({ status }) {
  const config = STATUS[status] || { label: status, tone: 'slate' }
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${tones[config.tone]}`}
    >
      <Circle size={6} className="fill-current" />
      {config.label}
    </span>
  )
}
