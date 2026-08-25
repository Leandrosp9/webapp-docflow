import { Download, FileWarning, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { authenticatedBlob } from '../services/api'

export function PdfViewer({ documentId, version }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let currentUrl
    let mounted = true
    authenticatedBlob(`/documents/${documentId}/versions/${version.id}/file`)
      .then((blob) => {
        currentUrl = URL.createObjectURL(blob)
        if (mounted) setUrl(currentUrl)
      })
      .catch((caught) => mounted && setError(caught.message))
    return () => {
      mounted = false
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [documentId, version.id])

  if (error)
    return (
      <div className="grid min-h-72 place-items-center text-sm text-rose-300">
        <div className="text-center">
          <FileWarning className="mx-auto mb-3" />
          {error}
        </div>
      </div>
    )
  if (!url)
    return (
      <div className="grid min-h-72 place-items-center text-slate-500">
        <LoaderCircle className="animate-spin" />
      </div>
    )
  return (
    <div>
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <p className="truncate text-xs text-slate-500">{version.original_filename}</p>
        <a
          href={url}
          download={version.original_filename}
          className="button-secondary !min-h-8 !px-3 !py-1 text-xs"
        >
          <Download size={13} /> Baixar
        </a>
      </div>
      <iframe
        title={version.original_filename || 'Documento PDF'}
        src={url}
        className="h-[680px] w-full bg-white"
      />
    </div>
  )
}
