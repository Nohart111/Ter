import type { DataConnection } from 'peerjs'
import type { FileHeader, FileChunk, FileComplete } from '../types'

const CHUNK_SIZE = 64 * 1024 // 64 KB per chunk

export async function sendFileInChunks(
  conn: DataConnection,
  file: File,
  onProgress: (percent: number, bytesSent: number) => void
): Promise<void> {
  const header: FileHeader = {
    type: 'header',
    name: file.name,
    size: file.size,
    mime: file.type || 'application/octet-stream'
  }

  // Gửi thông tin file trước
  conn.send(header)

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  let bytesSent = 0

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(start + CHUNK_SIZE, file.size)
    const slice = file.slice(start, end)
    const arrayBuffer = await slice.arrayBuffer()

    const chunkMsg: FileChunk = {
      type: 'chunk',
      index: i,
      total: totalChunks,
      data: arrayBuffer
    }

    // Chờ nếu buffer của DataChannel đang đầy (> 512KB) để tránh nghẽn RAM / rớt gói
    const dc = (conn as any).dataChannel as RTCDataChannel | undefined
    if (dc && dc.bufferedAmount > 512 * 1024) {
      await new Promise<void>((resolve) => {
        const checkBuffer = () => {
          if (!dc || dc.bufferedAmount <= 256 * 1024) {
            resolve()
          } else {
            setTimeout(checkBuffer, 15)
          }
        }
        checkBuffer()
      })
    }

    conn.send(chunkMsg)
    bytesSent += arrayBuffer.byteLength
    const percent = Math.min(100, Math.round((bytesSent / file.size) * 100))
    onProgress(percent, bytesSent)
  }

  // Gửi tín hiệu hoàn tất
  const completeMsg: FileComplete = { type: 'complete' }
  conn.send(completeMsg)
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}
