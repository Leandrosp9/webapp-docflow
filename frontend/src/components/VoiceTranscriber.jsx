import { CircleStop, Mic, Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

const MAX_SECONDS = 300
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/webm',
]

function durationLabel(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function supportedMimeType() {
  return MIME_CANDIDATES.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || ''
}

export function VoiceTranscriber({ onInsert }) {
  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timeoutRef = useRef(null)
  const [status, setStatus] = useState('idle')
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState('')

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  useEffect(() => {
    if (status !== 'recording') return undefined
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [status])

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current)
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      releaseStream()
    },
    [],
  )

  const transcribe = async (blob, mimeType) => {
    if (!blob.size) {
      setError('Nenhum áudio foi capturado. Tente novamente.')
      setStatus('idle')
      return
    }
    setStatus('transcribing')
    try {
      const body = new FormData()
      const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
      body.append('audio', blob, `gravacao.${extension}`)
      const result = await api('/ai/transcribe-audio', { method: 'POST', body })
      setTranscript(result.text)
      setStatus('preview')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('idle')
    }
  }

  const start = async () => {
    setError('')
    setTranscript('')
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('A gravação de áudio não é compatível com este navegador.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = supportedMimeType()
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => event.data.size && chunksRef.current.push(event.data)
      recorder.onstop = () => {
        window.clearTimeout(timeoutRef.current)
        releaseStream()
        const actualType = recorder.mimeType || mimeType || 'audio/webm'
        void transcribe(new Blob(chunksRef.current, { type: actualType }), actualType)
      }
      setSeconds(0)
      setStatus('recording')
      recorder.start(1000)
      timeoutRef.current = window.setTimeout(() => recorder.stop(), MAX_SECONDS * 1000)
    } catch {
      releaseStream()
      setError('Não foi possível acessar o microfone. Verifique a permissão do navegador.')
      setStatus('idle')
    }
  }

  const stop = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const insert = () => {
    if (!transcript.trim()) return
    onInsert(transcript.trim())
    setTranscript('')
    setStatus('idle')
  }

  return (
    <div className="mt-3 rounded-2xl border border-violet-400/15 bg-violet-400/[0.04] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-violet-400/10 p-2 text-violet-300">
            <Mic size={17} />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-200">Ditado com IA</p>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">
              Grave até 5 minutos. O Gemini transcreve e corrige o texto para sua aprovação.
            </p>
          </div>
        </div>
        {status === 'recording' ? (
          <button type="button" className="button-danger shrink-0" onClick={stop}>
            <CircleStop size={16} /> Parar · {durationLabel(seconds)}
          </button>
        ) : (
          <button
            type="button"
            className="button-secondary shrink-0"
            disabled={status === 'transcribing'}
            onClick={start}
          >
            {status === 'transcribing' ? (
              <>
                <Sparkles className="animate-pulse" size={16} /> Transcrevendo…
              </>
            ) : (
              <>
                <Mic size={16} /> Gravar mensagem
              </>
            )}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-300">
          {error}
        </p>
      )}
      {status === 'preview' && (
        <div className="mt-4 border-t border-white/[0.07] pt-4">
          <label className="label" htmlFor="voice-transcript">
            Prévia corrigida
          </label>
          <textarea
            id="voice-transcript"
            className="input py-3 text-sm leading-6"
            rows="5"
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
          />
          <p className="mt-2 text-xs text-slate-600">
            Confira o resultado. Ele só será incluído no documento após sua confirmação.
          </p>
          <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setTranscript('')
                setStatus('idle')
              }}
            >
              <Trash2 size={15} /> Descartar
            </button>
            <button type="button" className="button-primary" onClick={insert}>
              <Plus size={15} /> Adicionar ao conteúdo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
