import JSZip from 'jszip'
import { validateZipEntries, type ZipEntry } from '../lib/zip'

self.onmessage = async (event: MessageEvent<ZipEntry[]>) => {
  try {
    const error = validateZipEntries(event.data)
    if (error) throw new Error(error)
    const zip = new JSZip()
    for (const entry of event.data) {
      // Image encoders already compress their output where appropriate.
      zip.file(entry.name, entry.blob, { compression: 'STORE' })
    }
    const bytes = await zip.generateAsync({ type: 'arraybuffer', compression: 'STORE' })
    self.postMessage({ type: 'ready', bytes }, { transfer: [bytes] })
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown ZIP error',
    })
  }
}
