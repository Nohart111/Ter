import React, { useState } from 'react'
import confetti from 'canvas-confetti'
import { Download, Copy, Check, ArrowRight, X, FileText, Sparkles } from 'lucide-react'
import { PinInput } from './PinInput'
import { formatBytes } from '../utils/chunker'
import type { TransferStatus } from '../types'

interface ReceiverViewProps {
  pinValue: string[]
  setPinValue: (val: string[]) => void
  status: TransferStatus
  errorMessage: string | null
  progress: number
  receivedFile: { name: string; size: number; mime: string; blob: Blob; url: string } | null
  receivedText: string | null
  onConnect: (code: string) => void
  onReset: () => void
}

export const ReceiverView: React.FC<ReceiverViewProps> = ({
  pinValue,
  setPinValue,
  status,
  errorMessage,
  progress,
  receivedFile,
  receivedText,
  onConnect,
  onReset,
}) => {
  const [copied, setCopied] = useState(false)
  const isImage = receivedFile?.mime.startsWith('image/')

  React.useEffect(() => {
    if (status === 'completed' && (receivedFile || receivedText)) {
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#38bdf8', '#10b981'],
        })
      } catch (e) {
        console.error(e)
      }
    }
  }, [status, receivedFile, receivedText])

  const handleManualSubmit = () => {
    const fullCode = pinValue.join('')
    if (fullCode.length === 6) {
      onConnect(fullCode)
    }
  }

  const handleDownload = () => {
    if (!receivedFile) return
    const a = document.createElement('a')
    a.href = receivedFile.url
    a.download = receivedFile.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleCopyImage = async () => {
    if (!receivedFile || !isImage) return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ [receivedFile.mime]: receivedFile.blob }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      handleDownload()
    }
  }

  const handleCopyText = async () => {
    if (!receivedText) return
    await navigator.clipboard.writeText(receivedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
      {status === 'completed' && (receivedFile || receivedText) ? (
        <div className="p-6 sm:p-7 rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg shadow-zinc-500/5 dark:shadow-none text-center">
          {/* Nhận File */}
          {receivedFile && (
            <>
              {isImage ? (
                <div className="rounded-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800 mb-5 max-h-72 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-1">
                  <img
                    src={receivedFile.url}
                    alt=""
                    className="max-h-70 w-auto object-contain rounded-xl"
                  />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 mb-5 flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {receivedFile.name}
                    </p>
                    <p className="text-xs text-zinc-400">{formatBytes(receivedFile.size)}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {isImage && (
                  <button
                    onClick={handleCopyImage}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copied ? 'Đã sao chép' : 'Sao chép ảnh'}</span>
                  </button>
                )}

                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải về</span>
                </button>
              </div>
            </>
          )}

          {/* Nhận Text */}
          {receivedText && (
            <>
              <div className="flex items-center justify-between mb-3 px-1 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Văn bản nhận được</span>
                </span>
                <span>{receivedText.length} ký tự</span>
              </div>

              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-left mb-5 max-h-60 overflow-y-auto selection:bg-indigo-500 selection:text-white">
                <pre className="text-xs font-mono text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-words font-sans">
                  {receivedText}
                </pre>
              </div>

              <button
                onClick={handleCopyText}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copied ? 'Đã sao chép vào bộ nhớ đệm' : 'Sao chép văn bản'}</span>
              </button>
            </>
          )}

          <button
            onClick={onReset}
            className="mt-5 text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
          >
            Nhận nội dung khác
          </button>
        </div>
      ) : (
        <div className="p-8 rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-lg shadow-zinc-500/5 dark:shadow-none text-center">
          <div className="mb-6">
            <PinInput
              value={pinValue}
              onChange={setPinValue}
              onComplete={onConnect}
              disabled={status === 'connecting' || status === 'transferring'}
            />
          </div>

          {errorMessage && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-500 mb-4 animate-in fade-in duration-150">
              <X className="w-3.5 h-3.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {(status === 'connecting' || status === 'transferring') && (
            <div className="mt-4 text-left">
              <div className="flex items-center justify-between text-xs mb-1.5 text-zinc-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  <span>{status === 'connecting' ? 'Đang kết nối...' : 'Đang nhận...'}</span>
                </span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-sky-400 h-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status !== 'connecting' && status !== 'transferring' && (
            <button
              onClick={handleManualSubmit}
              disabled={pinValue.join('').length !== 6}
              className="w-full mt-2 flex items-center justify-center gap-1.5 py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-all shadow-sm"
            >
              <span>Nhận</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
