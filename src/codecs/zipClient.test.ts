import { vi } from 'vitest'
import { prepareZip } from './zipClient'

describe('ZIP worker client', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('surfaces worker failure and terminates it', async () => {
    const terminate = vi.fn()
    class FailingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null
      onerror: ((event: ErrorEvent) => void) | null = null
      terminate = terminate
      postMessage() {
        this.onmessage?.({ data: { type: 'error', message: 'Archive failed' } } as MessageEvent)
      }
    }
    vi.stubGlobal('Worker', FailingWorker)
    await expect(prepareZip([{ name: 'one.png', blob: new Blob(['a']) }])).rejects.toThrow(
      'Archive failed',
    )
    expect(terminate).toHaveBeenCalledOnce()
  })
})
