import { Check, FileClock, MessageSquareText, Send, Upload, XCircle } from 'lucide-react'
import { ACTIONS, formatDate } from '../utils/format'
import { Avatar } from './Avatar'

const iconByAction = {
  DOCUMENT_CREATED: FileClock,
  VERSION_CREATED: Upload,
  SENT_TO_REVIEW: Send,
  COMMENT_ADDED: MessageSquareText,
  CHANGES_REQUESTED: XCircle,
  APPROVED: Check,
  PUBLISHED: Check,
}

export function ActivityTimeline({ items, compact = false }) {
  return (
    <div className="space-y-0">
      {items.map((item, index) => {
        const Icon = iconByAction[item.action] || FileClock
        const userName = item.user?.name || item.user_name
        return (
          <div key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index !== items.length - 1 && (
              <span className="absolute left-[14px] top-8 h-[calc(100%-1.25rem)] w-px bg-white/[0.07]" />
            )}
            <span className="relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-[#141927] text-slate-400">
              <Icon size={13} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-1 text-sm">
                {!compact && <Avatar name={userName} size="sm" />}
                <span className="font-medium text-slate-200">{userName}</span>
                <span className="text-slate-500">{ACTIONS[item.action] || item.details}</span>
              </div>
              {item.document_title && (
                <p className="mt-1 truncate text-xs text-slate-400">{item.document_title}</p>
              )}
              {item.details && item.details !== ACTIONS[item.action] && !compact && (
                <p className="mt-1.5 text-xs leading-5 text-slate-500">{item.details}</p>
              )}
              <time className="mt-1 block text-[11px] text-slate-600">
                {formatDate(item.created_at, true)}
              </time>
            </div>
          </div>
        )
      })}
    </div>
  )
}
