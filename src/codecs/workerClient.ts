import type { ConversionOptions } from '../types'
import type { InspectResult, WorkerRequest, WorkerResponse } from './protocol'

interface Pending {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  onProgress?: (progress: number) => void
}

export interface ConversionResult {
  bytes: ArrayBuffer
  width: number
  height: number
  frameCount: number
}

export class CodecWorkerClient {
  private worker: Worker
  private pending = new Map<string, Pending>()

  constructor() {
    this.worker = this.createWorker()
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./converter.worker.ts', import.meta.url), {
      type: 'module',
      name: 'image-converter-codec',
    })
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handleMessage(event.data)
    worker.onerror = () => this.failAll('The image codec could not be initialised.')
    return worker
  }

  private handleMessage(message: WorkerResponse): void {
    const pending = this.pending.get(message.id)
    if (!pending) return
    if (message.type === 'progress') {
      pending.onProgress?.(message.progress)
      return
    }
    this.pending.delete(message.id)
    if (message.type === 'error') pending.reject(new Error(message.message))
    else if (message.type === 'inspected') pending.resolve(message.result)
    else pending.resolve(message)
  }

  private failAll(message: string): void {
    for (const pending of this.pending.values()) pending.reject(new Error(message))
    this.pending.clear()
  }

  private request<T>(request: WorkerRequest, onProgress?: (progress: number) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      const pending: Pending = {
        resolve: (value) => resolve(value as T),
        reject,
      }
      if (onProgress) pending.onProgress = onProgress
      this.pending.set(request.id, pending)
      this.worker.postMessage(request, { transfer: [request.bytes] })
    })
  }

  inspect(bytes: ArrayBuffer): Promise<InspectResult> {
    return this.request({ id: crypto.randomUUID(), type: 'inspect', bytes })
  }

  convert(
    bytes: ArrayBuffer,
    options: ConversionOptions,
    onProgress: (progress: number) => void,
  ): Promise<ConversionResult> {
    return this.request({ id: crypto.randomUUID(), type: 'convert', bytes, options }, onProgress)
  }

  cancel(): void {
    this.worker.terminate()
    this.failAll('Conversion cancelled.')
    this.worker = this.createWorker()
  }

  dispose(): void {
    this.worker.terminate()
    this.failAll('Codec worker disposed.')
  }
}
