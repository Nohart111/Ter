export interface FileHeader {
  type: 'header'
  name: string
  size: number
  mime: string
}

export interface FileChunk {
  type: 'chunk'
  index: number
  total: number
  data: ArrayBuffer
}

export interface FileComplete {
  type: 'complete'
}

export interface TextPayload {
  type: 'text'
  text: string
}

export interface ReadySignal {
  type: 'ready'
}

export type TransferMessage = FileHeader | FileChunk | FileComplete | TextPayload | ReadySignal

export type TransferStatus = 
  | 'idle' 
  | 'waiting' 
  | 'connecting' 
  | 'transferring' 
  | 'completed' 
  | 'error'
