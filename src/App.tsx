import { Code2, Download, Moon, ShieldCheck, Sun, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CodecWorkerClient } from './codecs/workerClient'
import { DropZone } from './components/DropZone'
import { FileCard } from './components/FileCard'
import { FormatGuide } from './components/FormatGuide'
import { SettingsPanel } from './components/SettingsPanel'
import { CAPABILITIES } from './formats'
import { useTheme } from './hooks/useTheme'
import { detectFileFormat } from './lib/formatDetection'
import { uniqueOutputName } from './lib/fileUtils'
import { validateBatchSize, validateDimensions, validateFileSize } from './lib/validation'
import type { ConversionOptions, ImageJob } from './types'

const DEFAULT_OPTIONS: ConversionOptions = {
  format: 'webp',
  quality: 82,
  background: '#ffffff',
  stripMetadata: true,
  resize: {
    width: null,
    height: null,
    fit: 'contain',
    preserveAspectRatio: true,
    neverUpscale: true,
  },
}
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export default function App() {
  const [jobs, setJobs] = useState<ImageJob[]>([])
  const jobsRef = useRef(jobs)
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [notice, setNotice] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const cancelRequested = useRef(false)
  const clientRef = useRef<CodecWorkerClient | null>(null)
  const { theme, setTheme } = useTheme()
  const updateJobs = useCallback((updater: (current: ImageJob[]) => ImageJob[]) => {
    setJobs((current) => {
      const next = updater(current)
      jobsRef.current = next
      return next
    })
  }, [])
  const getClient = () => (clientRef.current ??= new CodecWorkerClient())

  useEffect(
    () => () => {
      clientRef.current?.dispose()
      for (const job of jobsRef.current) {
        if (job.previewUrl) URL.revokeObjectURL(job.previewUrl)
        if (job.outputUrl) URL.revokeObjectURL(job.outputUrl)
      }
    },
    [],
  )

  const addFiles = useCallback(
    async (incoming: File[]) => {
      setNotice(null)
      if (!incoming.length) return
      const batchError = validateBatchSize(jobsRef.current.length, incoming.length)
      if (batchError) {
        setNotice(batchError)
        return
      }
      for (const file of incoming) {
        const sizeError = validateFileSize(file)
        if (sizeError) {
          setNotice(sizeError)
          continue
        }
        const detectedFormat = await detectFileFormat(file)
        if (!detectedFormat) {
          setNotice(`${file.name} is not a supported or recognisable image.`)
          continue
        }
        const id = makeId()
        const previewUrl = CAPABILITIES[detectedFormat].browserPreview
          ? URL.createObjectURL(file)
          : null
        const job: ImageJob = {
          id,
          file,
          detectedFormat,
          dimensions: null,
          frameCount: 1,
          previewUrl,
          status: 'inspecting',
          progress: 5,
          error: null,
          warning: null,
          output: null,
          outputUrl: null,
          outputName: null,
          outputFormat: null,
        }
        updateJobs((current) => [...current, job])
        try {
          const result = await getClient().inspect(await file.arrayBuffer())
          const dimensionError = validateDimensions(result.width, result.height)
          if (dimensionError) throw new Error(dimensionError)
          updateJobs((current) =>
            current.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    dimensions: { width: result.width, height: result.height },
                    frameCount: result.frameCount,
                    status: 'queued',
                    progress: 0,
                    warning:
                      result.frameCount > 1
                        ? `Contains ${result.frameCount} frames/pages. Only the first will be converted.`
                        : null,
                  }
                : entry,
            ),
          )
        } catch (error) {
          updateJobs((current) =>
            current.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    status: 'failed',
                    progress: 0,
                    error: error instanceof Error ? error.message : 'The file could not be read.',
                  }
                : entry,
            ),
          )
        }
      }
    },
    [updateJobs],
  )

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) =>
        file.type.startsWith('image/'),
      )
      if (files.length) void addFiles(files)
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  }, [addFiles])

  const removeJob = (id: string) => {
    const job = jobsRef.current.find((entry) => entry.id === id)
    if (job?.previewUrl) URL.revokeObjectURL(job.previewUrl)
    if (job?.outputUrl) URL.revokeObjectURL(job.outputUrl)
    updateJobs((current) => current.filter((entry) => entry.id !== id))
  }
  const clearAll = () => {
    for (const job of jobsRef.current) {
      if (job.previewUrl) URL.revokeObjectURL(job.previewUrl)
      if (job.outputUrl) URL.revokeObjectURL(job.outputUrl)
    }
    updateJobs(() => [])
    setNotice(null)
  }

  const convertAll = async () => {
    const pending = jobsRef.current.filter((job) => job.status === 'queued')
    if (!pending.length) return
    setRunning(true)
    setNotice(null)
    cancelRequested.current = false
    const usedNames = new Set(
      jobsRef.current.filter((job) => job.outputName).map((job) => job.outputName!.toLowerCase()),
    )
    for (const pendingJob of pending) {
      if (cancelRequested.current) break
      updateJobs((current) =>
        current.map((job) =>
          job.id === pendingJob.id
            ? { ...job, status: 'converting', progress: 2, error: null }
            : job,
        ),
      )
      try {
        const result = await getClient().convert(
          await pendingJob.file.arrayBuffer(),
          options,
          (progress) =>
            updateJobs((current) =>
              current.map((job) => (job.id === pendingJob.id ? { ...job, progress } : job)),
            ),
        )
        if (cancelRequested.current) break
        const blob = new Blob([result.bytes], { type: CAPABILITIES[options.format].mime })
        const outputName = uniqueOutputName(pendingJob.file.name, options.format, usedNames)
        const outputUrl = CAPABILITIES[options.format].browserPreview
          ? URL.createObjectURL(blob)
          : null
        if (pendingJob.previewUrl) URL.revokeObjectURL(pendingJob.previewUrl)
        updateJobs((current) =>
          current.map((job) =>
            job.id === pendingJob.id
              ? {
                  ...job,
                  status: 'complete',
                  progress: 100,
                  output: blob,
                  outputUrl,
                  outputName,
                  outputFormat: options.format,
                  previewUrl: null,
                  dimensions: { width: result.width, height: result.height },
                }
              : job,
          ),
        )
      } catch (error) {
        if (!cancelRequested.current)
          updateJobs((current) =>
            current.map((job) =>
              job.id === pendingJob.id
                ? {
                    ...job,
                    status: 'failed',
                    progress: 0,
                    error: error instanceof Error ? error.message : 'Conversion failed.',
                  }
                : job,
            ),
          )
      }
    }
    if (cancelRequested.current)
      updateJobs((current) =>
        current.map((job) =>
          job.status === 'converting' || job.status === 'queued'
            ? { ...job, status: 'cancelled', progress: 0 }
            : job,
        ),
      )
    setRunning(false)
  }

  const cancel = () => {
    cancelRequested.current = true
    clientRef.current?.cancel()
  }
  const retry = (id: string) =>
    updateJobs((current) =>
      current.map((job) =>
        job.id === id ? { ...job, status: 'queued', error: null, progress: 0 } : job,
      ),
    )
  const download = (job: ImageJob) => {
    if (job.output && job.outputName) saveBlob(job.output, job.outputName)
  }
  const completed = useMemo(
    () => jobs.filter((job) => job.status === 'complete' && job.output && job.outputName),
    [jobs],
  )
  const pendingCount = jobs.filter((job) => job.status === 'queued').length
  const overallProgress = jobs.length
    ? Math.round(
        jobs.reduce((sum, job) => sum + (job.status === 'complete' ? 100 : job.progress), 0) /
          jobs.length,
      )
    : 0
  const downloadAll = async () => {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    for (const job of completed) zip.file(job.outputName!, job.output!)
    saveBlob(
      await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }),
      'local-lens-conversions.zip',
    )
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="./" aria-label="Local Lens home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>LOCAL LENS</span>
        </a>
        <nav aria-label="Project links">
          <span className="privacy-badge">
            <ShieldCheck size={15} /> Local processing
          </span>
          <button
            className="icon-button"
            type="button"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <a
            className="icon-button"
            href="https://github.com/DenGian/image-converter"
            aria-label="View source on GitHub"
          >
            <Code2 size={18} />
          </a>
        </nav>
      </header>
      <main>
        <section className="hero">
          <p className="eyebrow">PRIVATE BY DEFAULT</p>
          <h1>
            Convert images.
            <br />
            <em>Keep them yours.</em>
          </h1>
          <p className="hero-copy">
            A capable image workshop that runs entirely in your browser. No uploads, no accounts, no
            waiting on a server.
          </p>
          <div className="hero-facts">
            <span>
              <strong>9</strong> useful formats
            </span>
            <span>
              <strong>0</strong> files uploaded
            </span>
            <span>
              <strong>100%</strong> in your browser
            </span>
          </div>
        </section>
        <section className="workspace" aria-label="Image conversion workspace">
          <div className="workspace-main">
            <DropZone onFiles={(files) => void addFiles(files)} disabled={running} />
            <FormatGuide />
            {notice && (
              <div className="notice" role="alert">
                <span>{notice}</span>
                <button
                  className="icon-button"
                  aria-label="Dismiss message"
                  onClick={() => setNotice(null)}
                >
                  <X size={17} />
                </button>
              </div>
            )}
            {jobs.length > 0 && (
              <section className="queue" aria-labelledby="queue-heading">
                <div className="queue-header">
                  <div>
                    <p className="eyebrow">YOUR BATCH</p>
                    <h2 id="queue-heading">
                      {jobs.length} {jobs.length === 1 ? 'image' : 'images'}
                    </h2>
                  </div>
                  <button
                    className="text-button"
                    type="button"
                    disabled={running}
                    onClick={clearAll}
                  >
                    <Trash2 size={15} /> Clear all
                  </button>
                </div>
                <div className="file-list">
                  {jobs.map((job) => (
                    <FileCard
                      key={job.id}
                      job={job}
                      onRemove={removeJob}
                      onRetry={retry}
                      onDownload={download}
                      locked={running}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
          <SettingsPanel options={options} onChange={setOptions} disabled={running} />
        </section>
        {jobs.length > 0 && (
          <section className="action-bar" aria-label="Batch actions">
            <div>
              <strong>
                {running
                  ? `Converting · ${overallProgress}%`
                  : pendingCount
                    ? `${pendingCount} ready to convert`
                    : completed.length
                      ? `${completed.length} complete`
                      : 'No queued images'}
              </strong>
              <span>Processed sequentially to keep memory use predictable</span>
            </div>
            <div className="action-buttons">
              {completed.length > 1 && (
                <button type="button" className="button ghost" onClick={() => void downloadAll()}>
                  <Download size={17} /> Download all (.zip)
                </button>
              )}
              {running ? (
                <button type="button" className="button danger" onClick={cancel}>
                  <X size={17} /> Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="button primary convert-button"
                  disabled={!pendingCount}
                  onClick={() => void convertAll()}
                >
                  Convert {pendingCount || ''} {pendingCount === 1 ? 'image' : 'images'}
                </button>
              )}
            </div>
          </section>
        )}
        <div className="visually-hidden" aria-live="polite">
          {running
            ? `Conversion ${overallProgress} percent complete`
            : completed.length
              ? `${completed.length} conversions complete`
              : ''}
        </div>
      </main>
      <footer>
        <span>Local Lens · Open source under MIT</span>
        <span>Your files stay on this device.</span>
      </footer>
    </div>
  )
}
