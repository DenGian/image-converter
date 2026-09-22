import { vi } from 'vitest'
import { CodecWorkerClient } from './workerClient'
import type { WorkerRequest, WorkerResponse } from './protocol'

it('restarts the codec worker after cancellation and accepts a new request', async () => {
  const workers: FakeWorker[] = []
  class FakeWorker {
    onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null
    onerror: ((event: ErrorEvent) => void) | null = null
    terminate = vi.fn()
    postMessage = vi.fn<(request: WorkerRequest) => void>()
    constructor() {
      workers.push(this)
    }
  }
  vi.stubGlobal('Worker', FakeWorker)
  try {
    const client = new CodecWorkerClient()
    const pending = client.inspect(new ArrayBuffer(1))
    client.cancel()
    await expect(pending).rejects.toThrow('cancelled')
    const firstWorker = workers.at(0)
    const nextWorker = workers.at(1)
    if (!firstWorker || !nextWorker) throw new Error('Expected replacement worker')
    expect(firstWorker.terminate).toHaveBeenCalledOnce()
    const next = client.inspect(new ArrayBuffer(1))
    const request = nextWorker.postMessage.mock.calls.at(0)?.[0]
    if (!request) throw new Error('Expected inspection request')
    nextWorker.onmessage?.({
      data: {
        id: request.id,
        type: 'inspected',
        result: { width: 1, height: 1, frameCount: 1, format: 'PNG' },
      },
    } as MessageEvent<WorkerResponse>)
    await expect(next).resolves.toMatchObject({ width: 1, height: 1 })
    client.dispose()
  } finally {
    vi.unstubAllGlobals()
  }
})
