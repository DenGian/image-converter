import { initializeImageMagick } from '@imagemagick/magick-wasm'
import wasmUrl from '@imagemagick/magick-wasm/magick.wasm?url'
import { convertWithMagick, inspectWithMagick } from './magickAdapter'
import type { WorkerRequest, WorkerResponse } from './protocol'
import { RESOURCE_LIMITS } from '../lib/validation'
import { isOutputFormat } from '../formats'

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
    if (request.bytes.byteLength === 0 || request.bytes.byteLength > RESOURCE_LIMITS.maxFileBytes)
      throw new Error('Source file exceeds the browser safety limit or is empty.')
    send({ id: request.id, type: 'progress', progress: 5 })
    await initialize()
    send({ id: request.id, type: 'progress', progress: 18 })
    const bytes = new Uint8Array(request.bytes)

    if (request.type === 'inspect') {
      send({ id: request.id, type: 'inspected', result: inspectWithMagick(bytes) })
      return
    }

    if (
      !isOutputFormat(request.options.format) ||
      !Number.isFinite(request.options.quality) ||
      request.options.quality < 1 ||
      request.options.quality > 100 ||
      !/^#[0-9a-f]{6}$/i.test(request.options.background)
    )
      throw new Error('Invalid conversion settings.')

    send({ id: request.id, type: 'progress', progress: 35 })
    const result = convertWithMagick(bytes, request.options)
    if (result.bytes.byteLength > RESOURCE_LIMITS.maxTotalOutputBytes)
      throw new Error('Output exceeds the 150 MiB browser safety limit.')
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
