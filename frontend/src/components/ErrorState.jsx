import { AlertTriangle, RotateCcw } from 'lucide-react'

export function ErrorState({ message = 'Não foi possível carregar os dados.', onRetry }) {
  return (
    <div className="card flex min-h-64 flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="mb-4 text-amber-300" size={28} />
      <p className="text-sm text-slate-400">{message}</p>
      {onRetry && (
        <button className="button-secondary mt-5" onClick={onRetry}>
          <RotateCcw size={15} /> Tentar novamente
        </button>
      )}
    </div>
  )
}
