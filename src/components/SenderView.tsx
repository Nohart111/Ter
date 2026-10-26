import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Check, QrCode, X, CheckCircle2, FileText, Sparkles } from 'lucide-react'
import { formatBytes } from '../utils/chunker'
import type { TransferStatus } from '../types'

interface SenderViewProps {
  payload: { type: 'file'; file: File } | { type: 'text'; text: string }
  pin: string
  status: TransferStatus
  progress: number
  bytesSent: number
  onReset: () => void
}

export const SenderView: React.FC<SenderViewProps> = ({
  payload,
  pin,
  status,
  progress,
  onReset,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const isFile = payload.type === 'file'
  const isImage = isFile && payload.file.type.startsWith('image/')
  const directLink = `${window.location.origin}${window.location.pathname}?code=${pin}`

  useEffect(() => {
    if (isFile && isImage) {
      const url = URL.createObjectURL(payload.file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [payload, isFile, isImage])

  useEffect(() => {
    if (pin) {
      QRCode.toDataURL(directLink, {
        width: 260,
        margin: 1,
        color: { dark: '#09090b', light: '#ffffff' },
      }).then(setQrDataUrl)
    }
  }, [pin, directLink])

  const copyCode = () => {
    navigator.clipboard.writeText(pin)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formattedPin = pin.length === 6 ? `${pin.slice(0, 3)} ${pin.slice(3)}` : pin

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {/* Payload Card */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        {isFile ? (
          <div className="flex items-center gap-3 min-w-0 pr-2">
            {isImage && previewUrl ? (
              <img
                src={previewUrl}
                alt=""
                className="w-10 h-10 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {payload.file.name}
              </p>
              <p className="text-xs text-zinc-400">{formatBytes(payload.file.size)}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-500 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {payload.text}
              </p>
              <p className="text-xs text-zinc-400">{payload.text.length} ký tự</p>
            </div>
          </div>
        )}

        <button
          onClick={onReset}
          className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0"
          title="Hủy"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Code Display Card */}
      <div className="relative p-8 rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg shadow-zinc-500/5 dark:shadow-none text-center overflow-hidden">
        {/* Subtle decorative gradient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-indigo-500/10 to-transparent blur-2xl pointer-events-none -z-10" />

        <div
          onClick={copyCode}
          className="cursor-pointer group select-none inline-block p-4 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all duration-200"
          title="Bấm để sao chép"
        >
          <div className="font-mono text-5xl sm:text-6xl font-bold tracking-widest text-zinc-900 dark:text-zinc-100 group-hover:scale-[1.02] transition-transform">
            {formattedPin}
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs font-medium text-zinc-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copied ? 'Đã sao chép' : 'Bấm để sao chép'}</span>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center justify-center gap-3 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
          <button
            onClick={() => setShowQr(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mã QR</span>
          </button>
        </div>

        {/* Progress Bar (nếu là file đang truyền) */}
        {(status === 'transferring' || status === 'completed') && (
          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800/60 text-left">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                {status === 'completed' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Hoàn tất</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span>Đang gửi...</span>
                  </>
                )}
              </span>
              <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${
                  status === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQr && (
        <div
          onClick={() => setShowQr(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-xs w-full text-center border border-zinc-200 dark:border-zinc-800 shadow-2xl"
          >
            {qrDataUrl && <img src={qrDataUrl} alt="" className="w-56 h-56 mx-auto rounded-xl" />}
            <button
              onClick={() => setShowQr(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
