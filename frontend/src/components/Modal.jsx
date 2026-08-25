import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export function Modal({ open, onClose, title, description, children, size = 'md' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className={`card max-h-[90vh] w-full overflow-y-auto p-6 shadow-2xl ${size === 'lg' ? 'max-w-3xl' : 'max-w-lg'}`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                )}
              </div>
              <button
                aria-label="Fechar"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
                onClick={onClose}
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  loading,
  onClose,
  onConfirm,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex justify-end gap-2">
        <button className="button-secondary" disabled={loading} onClick={onClose}>
          Cancelar
        </button>
        <button
          className={danger ? 'button-danger' : 'button-primary'}
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? 'Processando…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
