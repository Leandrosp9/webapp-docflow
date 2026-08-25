import { Layers3 } from 'lucide-react'

export function Logo({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-cyan text-white shadow-glow">
        <Layers3 size={18} strokeWidth={2.2} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-ink bg-emerald-400" />
      </div>
      {!compact && (
        <div>
          <div className="font-['Manrope'] text-[17px] font-bold tracking-[-0.03em] text-white">
            DocFlow
          </div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-600">
            Document control
          </div>
        </div>
      )}
    </div>
  )
}
