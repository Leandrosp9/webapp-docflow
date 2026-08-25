import { initials } from '../utils/format'

const colors = [
  'from-violet-500 to-indigo-500',
  'from-cyan-500 to-blue-500',
  'from-rose-500 to-orange-500',
]

export function Avatar({ name, size = 'md' }) {
  const index = (name || '').length % colors.length
  return (
    <span
      title={name}
      className={`inline-grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${colors[index]} font-semibold text-white ${
        size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'
      }`}
    >
      {initials(name)}
    </span>
  )
}
