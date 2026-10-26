import { useState, useEffect, useRef } from 'react'
import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import { UploadCloud, FileUp, Type, ArrowRight } from 'lucide-react'
import { Header } from './components/Header'
import { SenderView } from './components/SenderView'
import { ReceiverView } from './components/ReceiverView'
import { sendFileInChunks } from './utils/chunker'
import type { TransferStatus, TransferMessage, FileHeader } from './types'

export function App() {
  const [activeTab, setActiveTab] = useState<'send' | 'receive'>('send')
  const [sendType, setSendType] = useState<'file' | 'text'>('file')

  const [senderPayload, setSenderPayload] = useState<
    { type: 'file'; file: File } | { type: 'text'; text: string } | null
  >(null)
  const [textInput, setTextInput] = useState('')

  const [pin, setPin] = useState<string>('')
  const [receiverPin, setReceiverPin] = useState<string[]>(['', '', '', '', '', ''])

  const [status, setStatus] = useState<TransferStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [bytesTransferred, setBytesTransferred] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Received Content
  const [receivedFile, setReceivedFile] = useState<{
    name: string
    size: number
    mime: string
    blob: Blob
    url: string
  } | null>(null)
  const [receivedText, setReceivedText] = useState<string | null>(null)

  const senderPeerRef = useRef<Peer | null>(null)
  const receiverPeerRef = useRef<Peer | null>(null)
  const activeConnRef = useRef<DataConnection | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Tự động kết nối nếu URL có ?code=XXXXXX
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const codeParam = urlParams.get('code')
    if (codeParam && codeParam.length === 6 && /^\d+$/.test(codeParam)) {
      setActiveTab('receive')
      setReceiverPin(codeParam.split(''))
      const timer = setTimeout(() => {
        handleConnectToSender(codeParam)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [])

  // Bắt sự kiện Ctrl + V toàn màn hình
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const activeEl = document.activeElement
      // Nếu đang gõ trong ô textarea hoặc input thì không can thiệp
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return

      if (e.clipboardData) {
        if (e.clipboardData.files && e.clipboardData.files.length > 0) {
          e.preventDefault()
          stageFileToSend(e.clipboardData.files[0])
        } else {
          const pastedText = e.clipboardData.getData('text')
          if (pastedText && pastedText.trim()) {
            e.preventDefault()
            stageTextToSend(pastedText.trim())
          }
        }
      }
    }

    window.addEventListener('paste', handleGlobalPaste)
    return () => window.removeEventListener('paste', handleGlobalPaste)
  }, [])

  // Khởi tạo gửi File
  const stageFileToSend = (file: File) => {
    initSenderPeer({ type: 'file', file })
  }

  // Khởi tạo gửi Text
  const stageTextToSend = (text: string) => {
    if (!text.trim()) return
    initSenderPeer({ type: 'text', text: text.trim() })
  }

  const initSenderPeer = (payload: { type: 'file'; file: File } | { type: 'text'; text: string }) => {
    cleanupSenderPeer()

    setSenderPayload(payload)
    setActiveTab('send')
    setStatus('waiting')
    setProgress(0)
    setBytesTransferred(0)

    const randomPin = Math.floor(100000 + Math.random() * 900000).toString()
    setPin(randomPin)

    const peerId = `ter-${randomPin}`
    const peer = new Peer(peerId)
    senderPeerRef.current = peer

    peer.on('connection', (conn) => {
      activeConnRef.current = conn

      conn.on('open', async () => {
        setStatus('transferring')
        try {
          if (payload.type === 'file') {
            await sendFileInChunks(conn, payload.file, (p, bytes) => {
              setProgress(p)
              setBytesTransferred(bytes)
            })
          } else {
            conn.send({ type: 'text', text: payload.text })
            setProgress(100)
          }
          setStatus('completed')
        } catch {
          setStatus('error')
        }
      })
    })

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        initSenderPeer(payload)
      }
    })
  }

  // Kết nối tới máy gửi để nhận nội dung
  const handleConnectToSender = (targetPin: string) => {
    cleanupReceiverPeer()
    setErrorMessage(null)
    setStatus('connecting')
    setProgress(0)

    const receiverPeer = new Peer()
    receiverPeerRef.current = receiverPeer

    let timeout: any = null

    receiverPeer.on('open', () => {
      const conn = receiverPeer.connect(`ter-${targetPin}`, { reliable: true })
      activeConnRef.current = conn

      timeout = setTimeout(() => {
        if (status !== 'transferring' && status !== 'completed') {
          setStatus('idle')
          setErrorMessage('Mã không hợp lệ hoặc đã hết hạn')
          conn.close()
        }
      }, 10000)

      let header: FileHeader | null = null
      const chunks: ArrayBuffer[] = []
      let bytesReceived = 0

      conn.on('open', () => {
        clearTimeout(timeout)
        setStatus('transferring')
      })

      conn.on('data', (data: any) => {
        const msg = data as TransferMessage

        if (msg.type === 'text') {
          // Nhận được văn bản
          setReceivedText(msg.text)
          setReceivedFile(null)
          setProgress(100)
          setStatus('completed')
        } else if (msg.type === 'header') {
          header = msg
          chunks.length = 0
          bytesReceived = 0
        } else if (msg.type === 'chunk') {
          chunks.push(msg.data)
          bytesReceived += msg.data.byteLength
          if (header && header.size > 0) {
            setProgress(Math.min(100, Math.round((bytesReceived / header.size) * 100)))
          }
        } else if (msg.type === 'complete') {
          if (header) {
            const fullBlob = new Blob(chunks, { type: header.mime })
            setReceivedFile({
              name: header.name,
              size: header.size,
              mime: header.mime,
              blob: fullBlob,
              url: URL.createObjectURL(fullBlob),
            })
            setReceivedText(null)
            setProgress(100)
            setStatus('completed')
          }
        }
      })

      conn.on('error', () => {
        clearTimeout(timeout)
        setStatus('idle')
        setErrorMessage('Mất kết nối')
      })
    })

    receiverPeer.on('error', () => {
      clearTimeout(timeout)
      setStatus('idle')
      setErrorMessage('Không thể kết nối')
    })
  }

  const cleanupSenderPeer = () => {
    activeConnRef.current?.close()
    activeConnRef.current = null
    senderPeerRef.current?.destroy()
    senderPeerRef.current = null
  }

  const cleanupReceiverPeer = () => {
    activeConnRef.current?.close()
    activeConnRef.current = null
    receiverPeerRef.current?.destroy()
    receiverPeerRef.current = null
  }

  const handleResetSender = () => {
    cleanupSenderPeer()
    setSenderPayload(null)
    setTextInput('')
    setPin('')
    setStatus('idle')
    setProgress(0)
    setBytesTransferred(0)
  }

  const handleResetReceiver = () => {
    cleanupReceiverPeer()
    setReceivedFile(null)
    setReceivedText(null)
    setReceiverPin(['', '', '', '', '', ''])
    setStatus('idle')
    setErrorMessage(null)
    setProgress(0)
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setIsDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files?.[0]) stageFileToSend(e.dataTransfer.files[0])
      }}
      className="min-h-screen flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative"
    >
      {/* Decorative ambient background lighting */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl h-80 bg-gradient-to-b from-indigo-500/10 via-sky-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      <Header />

      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-150">
          <UploadCloud className="w-12 h-12 mb-3 animate-bounce" />
          <p className="text-sm font-semibold tracking-wide">Thả file để gửi ngay</p>
        </div>
      )}

      {/* Main Container */}
      <main className="w-full max-w-md mx-auto px-4 py-4 flex-1 flex flex-col justify-center">
        {/* Main Tab Switcher (Gửi / Nhận) */}
        {!senderPayload && status !== 'completed' && (
          <div className="flex justify-center mb-6">
            <div className="bg-zinc-200/60 dark:bg-zinc-900/80 p-1 rounded-2xl flex items-center gap-1 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-inner">
              <button
                onClick={() => {
                  setActiveTab('send')
                  setErrorMessage(null)
                }}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'send'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Gửi
              </button>
              <button
                onClick={() => {
                  setActiveTab('receive')
                  setErrorMessage(null)
                }}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  activeTab === 'receive'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                Nhận
              </button>
            </div>
          </div>
        )}

        {/* Tab Gửi */}
        {activeTab === 'send' && (
          <div>
            {senderPayload && pin ? (
              <SenderView
                payload={senderPayload}
                pin={pin}
                status={status}
                progress={progress}
                bytesSent={bytesTransferred}
                onReset={handleResetSender}
              />
            ) : (
              <div className="space-y-4">
                {/* Switcher Tệp / Văn bản */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setSendType('file')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      sendType === 'file'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Tệp tin</span>
                  </button>

                  <button
                    onClick={() => setSendType('text')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      sendType === 'text'
                        ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>Văn bản</span>
                  </button>
                </div>

                {/* Chế độ Gửi File */}
                {sendType === 'file' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-3xl p-12 text-center cursor-pointer bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) stageFileToSend(e.target.files[0])
                      }}
                    />

                    <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      <UploadCloud className="w-6 h-6" />
                    </div>

                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
                      Kéo thả file hoặc bấm chọn
                    </p>
                    <p className="text-[11px] text-zinc-400">
                      Hoặc bấm <kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[10px] text-zinc-600 dark:text-zinc-400">Ctrl+V</kbd> để dán ảnh / file
                    </p>
                  </div>
                ) : (
                  /* Chế độ Gửi Text */
                  <div className="p-4 sm:p-5 rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
                    <textarea
                      rows={5}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Dán hoặc nhập nội dung văn bản, liên kết, ghi chú..."
                      className="w-full text-xs font-sans bg-transparent resize-none outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 leading-relaxed"
                    />

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                      <span className="text-[11px] text-zinc-400">
                        {textInput.length} ký tự
                      </span>

                      <button
                        onClick={() => stageTextToSend(textInput)}
                        disabled={!textInput.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                      >
                        <span>Tạo mã</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab Nhận */}
        {activeTab === 'receive' && (
          <ReceiverView
            pinValue={receiverPin}
            setPinValue={setReceiverPin}
            status={status}
            errorMessage={errorMessage}
            progress={progress}
            receivedFile={receivedFile}
            receivedText={receivedText}
            onConnect={handleConnectToSender}
            onReset={handleResetReceiver}
          />
        )}
      </main>

      {/* Minimal clean footer spacer */}
      <footer className="py-6" />
    </div>
  )
}
export default App
