import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const remove = useCallback(
    (id) => setToasts((items) => items.filter((item) => item.id !== id)),
    [],
  )
  const toast = useCallback(
    (message, type = 'success') => {
      const id = crypto.randomUUID()
      setToasts((items) => [...items, { id, message, type }])
      window.setTimeout(() => remove(id), 4200)
    },
    [remove],
  )
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[80] flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20 }}
              className="card flex items-center gap-3 border-white/10 p-4 shadow-2xl"
              role="status"
            >
              {item.type === 'error' ? (
                <CircleAlert className="text-rose-300" size={18} />
              ) : (
                <CheckCircle2 className="text-emerald-300" size={18} />
              )}
              <p className="flex-1 text-sm text-slate-200">{item.message}</p>
              <button
                aria-label="Fechar"
                className="text-slate-500 hover:text-white"
                onClick={() => remove(item.id)}
              >
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
