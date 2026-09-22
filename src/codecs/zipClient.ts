import { validateZipEntries, type ZipEntry } from '../lib/zip'

export function prepareZip(entries: ZipEntry[]): Promise<Blob> {
  const error = validateZipEntries(entries)
  if (error) return Promise.reject(new Error(error))
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./zip.worker.ts', import.meta.url), {
      type: 'module',
      name: 'image-converter-zip',
    })
    worker.onerror = () => {
      worker.terminate()
      reject(new Error('ZIP worker could not start.'))
    }
    worker.onmessage = (
      event: MessageEvent<
        { type: 'ready'; bytes: ArrayBuffer } | { type: 'error'; message: string }
      >,
    ) => {
      worker.terminate()
      if (event.data.type === 'error') reject(new Error(event.data.message))
      else resolve(new Blob([event.data.bytes], { type: 'application/zip' }))
    }
    worker.postMessage(entries)
  })
}
