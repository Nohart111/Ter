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

export type TransferMessage = FileHeader | FileChunk | FileComplete | TextPayload

export type TransferStatus = 
  | 'idle' 
  | 'waiting' 
  | 'connecting' 
  | 'transferring' 
  | 'completed' 
  | 'error'
