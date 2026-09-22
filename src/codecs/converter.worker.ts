import { initializeImageMagick } from '@imagemagick/magick-wasm'
import wasmUrl from '@imagemagick/magick-wasm/magick.wasm?url'
import { convertWithMagick, inspectWithMagick } from './magickAdapter'
import type { WorkerRequest, WorkerResponse } from './protocol'

let initialization: Promise<void> | undefined

function initialize(): Promise<void> {
  initialization ??= initializeImageMagick(new URL(wasmUrl, import.meta.url))
  return initialization
}

function send(message: WorkerResponse, transfer: Transferable[] = []): void {
  self.postMessage(message, { transfer })
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  try {
    send({ id: request.id, type: 'progress', progress: 5 })
    await initialize()
    send({ id: request.id, type: 'progress', progress: 18 })
    const bytes = new Uint8Array(request.bytes)

    if (request.type === 'inspect') {
      send({ id: request.id, type: 'inspected', result: inspectWithMagick(bytes) })
      return
    }

    send({ id: request.id, type: 'progress', progress: 35 })
    const result = convertWithMagick(bytes, request.options)
    send({ id: request.id, type: 'progress', progress: 92 })
    const output = new Uint8Array(result.bytes).slice().buffer
    send(
      {
        id: request.id,
        type: 'converted',
        bytes: output,
        width: result.width,
        height: result.height,
        frameCount: result.frameCount,
      },
      [output],
    )
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown codec error'
    send({ id: request.id, type: 'error', message: detail })
  }
}
