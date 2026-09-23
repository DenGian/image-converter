import { Code2, Download, Monitor, Moon, Sun, Trash2, X } from 'lucide-react'
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
import { validateResizePlan } from './lib/resize'
import {
  validateBatchSize,
  validateDimensions,
  validateFileSize,
  validateTotalBytes,
  zipEligibility,
} from './lib/validation'
import { prepareZip } from './codecs/zipClient'
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
  const allocatedUrlsRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(false)
  const [options, setOptions] = useState(DEFAULT_OPTIONS)
  const [notice, setNotice] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [preparingZip, setPreparingZip] = useState(false)
  const cancelRequested = useRef(false)
  const clientRef = useRef<CodecWorkerClient | null>(null)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const updateJobs = useCallback((updater: (current: ImageJob[]) => ImageJob[]) => {
    setJobs((current) => {
      const next = updater(current)
      jobsRef.current = next
      return next
    })
  }, [])
  const getClient = useCallback(() => (clientRef.current ??= new CodecWorkerClient()), [])
  const createJobUrl = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob)
    allocatedUrlsRef.current.add(url)
    return url
  }, [])

  useEffect(() => {
    const activeUrls = new Set(
      jobs.flatMap((job) => [job.previewUrl, job.outputUrl].filter((url): url is string => !!url)),
    )
    for (const url of allocatedUrlsRef.current) {
      if (!activeUrls.has(url)) {
        URL.revokeObjectURL(url)
        allocatedUrlsRef.current.delete(url)
      }
    }
  }, [jobs])

  useEffect(() => {
    const allocatedUrls = allocatedUrlsRef.current
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clientRef.current?.dispose()
      for (const url of allocatedUrls) URL.revokeObjectURL(url)
      allocatedUrls.clear()
    }
  }, [])

  const inspectJob = useCallback(
    async (job: ImageJob) => {
      try {
        const result = await getClient().inspect(await job.file.arrayBuffer())
        if (!mountedRef.current) return
        const dimensionError = validateDimensions(result.width, result.height)
        if (dimensionError) throw new Error(dimensionError)
        updateJobs((current) =>
          current.map((entry) =>
            entry.id === job.id
              ? {
                  ...entry,
                  dimensions: { width: result.width, height: result.height },
                  previewUrl:
                    entry.previewUrl ??
                    (CAPABILITIES[job.detectedFormat].browserPreview
                      ? createJobUrl(job.file)
                      : null),
                  frameCount: result.frameCount,
                  status: 'queued',
                  progress: 0,
                  error: null,
                  warning:
                    result.frameCount > 1
                      ? `Contains ${result.frameCount} frames/pages. Only the first will be converted.`
                      : null,
                }
              : entry,
          ),
        )
      } catch (error) {
        if (!mountedRef.current) return
        updateJobs((current) =>
          current.map((entry) =>
            entry.id === job.id
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
    },
    [createJobUrl, getClient, updateJobs],
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
      const rejected: string[] = []
      let retainedBytes = jobsRef.current.reduce((sum, job) => sum + job.file.size, 0)
      for (const file of incoming) {
        const sizeError = validateFileSize(file)
        const totalError = validateTotalBytes(retainedBytes, file.size, 'source')
        if (sizeError || totalError) {
          rejected.push(`${file.name}: ${sizeError ?? totalError}`)
          continue
        }
        const detectedFormat = await detectFileFormat(file)
        if (!detectedFormat) {
          rejected.push(`${file.name}: unsupported or unrecognisable image.`)
          continue
        }
        retainedBytes += file.size
        const id = makeId()
        const job: ImageJob = {
          id,
          file,
          detectedFormat,
          dimensions: null,
          frameCount: 1,
          previewUrl: null,
          status: 'inspecting',
          progress: 5,
          error: null,
          warning: null,
          output: null,
          outputUrl: null,
          outputName: null,
          outputFormat: null,
          outputDimensions: null,
          outputOptions: null,
        }
        updateJobs((current) => [...current, job])
        await inspectJob(job)
      }
      if (rejected.length) setNotice(rejected.join(' '))
    },
    [inspectJob, updateJobs],
  )

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? [])
      if (files.length) void addFiles(files)
    }
    window.addEventListener('paste', paste)
    return () => window.removeEventListener('paste', paste)
  }, [addFiles])

  const removeJob = (id: string) => {
    updateJobs((current) => current.filter((entry) => entry.id !== id))
  }
  const clearAll = () => {
    updateJobs(() => [])
    setNotice(null)
  }

  const clearOutputs = () => {
    updateJobs((current) =>
      current.map((job) => ({
        ...job,
        output: null,
        outputUrl: null,
        outputName: null,
        outputFormat: null,
        outputDimensions: null,
        outputOptions: null,
        status: job.status === 'complete' ? 'queued' : job.status,
      })),
    )
  }

  const requeue = (id: string) => {
    const job = jobsRef.current.find((entry) => entry.id === id)
    if (!job || job.status === 'inspecting' || job.status === 'converting') return
    updateJobs((current) =>
      current.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              status: job.dimensions ? 'queued' : 'inspecting',
              error: null,
              progress: 0,
              output: null,
              outputUrl: null,
              outputName: null,
              outputFormat: null,
              outputDimensions: null,
              outputOptions: null,
              previewUrl: job.dimensions
                ? (entry.previewUrl ??
                  (CAPABILITIES[entry.detectedFormat].browserPreview
                    ? createJobUrl(entry.file)
                    : null))
                : null,
            }
          : entry,
      ),
    )
    if (!job.dimensions) void inspectJob(job)
  }
  const requeueAll = () => {
    for (const job of jobsRef.current) requeue(job.id)
  }

  const settingsError =
    jobs
      .filter((job) => job.status === 'queued' && job.dimensions)
      .map((job) => validateResizePlan(job.dimensions!, options.resize))
      .find(Boolean) ?? null

  const convertAll = async () => {
    const pending = jobsRef.current.filter((job) => job.status === 'queued')
    if (!pending.length || settingsError) return
    setRunning(true)
    setNotice(null)
    cancelRequested.current = false
    const usedNames = new Set(
      jobsRef.current.filter((job) => job.outputName).map((job) => job.outputName!.toLowerCase()),
    )
    for (const pendingJob of pending) {
      if (cancelRequested.current) break
      const resizeError =
        pendingJob.dimensions && validateResizePlan(pendingJob.dimensions, options.resize)
      if (resizeError) {
        setNotice(`${pendingJob.file.name}: ${resizeError}`)
        break
      }
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
        if (cancelRequested.current || !mountedRef.current) break
        const blob = new Blob([result.bytes], { type: CAPABILITIES[options.format].mime })
        const retainedOutput = jobsRef.current.reduce(
          (sum, job) => sum + (job.id === pendingJob.id ? 0 : (job.output?.size ?? 0)),
          0,
        )
        const outputError = validateTotalBytes(retainedOutput, blob.size, 'output')
        if (outputError) throw new Error(outputError)
        const outputName = uniqueOutputName(pendingJob.file.name, options.format, usedNames)
        updateJobs((current) =>
          current.map((job) =>
            job.id === pendingJob.id
              ? {
                  ...job,
                  status: 'complete',
                  progress: 100,
                  output: blob,
                  outputUrl: CAPABILITIES[options.format].browserPreview
                    ? createJobUrl(blob)
                    : null,
                  outputName,
                  outputFormat: options.format,
                  outputDimensions: { width: result.width, height: result.height },
                  outputOptions: structuredClone(options),
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
  const download = (job: ImageJob) => {
    if (job.output && job.outputName) saveBlob(job.output, job.outputName)
  }
  const completed = useMemo(
    () => jobs.filter((job) => job.status === 'complete' && job.output && job.outputName),
    [jobs],
  )
  const pendingCount = jobs.filter((job) => job.status === 'queued').length
  const zipError = zipEligibility(completed.reduce((sum, job) => sum + (job.output?.size ?? 0), 0))
  const downloadAll = async () => {
    if (zipError || preparingZip) return
    setPreparingZip(true)
    setNotice(null)
    try {
      saveBlob(
        await prepareZip(completed.map((job) => ({ name: job.outputName!, blob: job.output! }))),
        'image-converter-files.zip',
      )
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `ZIP preparation failed: ${error.message}`
          : 'ZIP preparation failed.',
      )
    } finally {
      setPreparingZip(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Image Converter home">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span>Image Converter</span>
        </a>
        <nav aria-label="Project links">
          <a href="#format-support" className="header-link">
            Formats
          </a>
          <label className="theme-control">
            <span className="visually-hidden">Theme preference</span>
            {theme === 'system' ? (
              <Monitor size={17} aria-hidden="true" />
            ) : resolvedTheme === 'dark' ? (
              <Moon size={17} aria-hidden="true" />
            ) : (
              <Sun size={17} aria-hidden="true" />
            )}
            <select
              aria-label="Theme preference"
              value={theme}
              onChange={(event) => setTheme(event.target.value as typeof theme)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <a
            className="icon-button"
            href="https://github.com/DenGian/image-converter"
            aria-label="View source on GitHub"
            title="View source on GitHub"
          >
            <Code2 size={18} />
          </a>
        </nav>
      </header>
      <main>
        <section className="hero">
          <h1>Convert images</h1>
          <p className="hero-copy">
            Batch-convert and resize images directly in your browser. Your files do not leave this
            device.
          </p>
        </section>
        <section className="workspace" aria-label="Image conversion workspace">
          <div className="workspace-main">
            <DropZone onFiles={(files) => void addFiles(files)} disabled={running} />
            <div id="format-support">
              <FormatGuide />
            </div>
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
                    <h2 id="queue-heading">
                      {jobs.length} {jobs.length === 1 ? 'image' : 'images'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    disabled={running || !completed.length}
                    onClick={clearOutputs}
                  >
                    Clear outputs
                  </button>
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
                      onRetry={requeue}
                      onDownload={download}
                      locked={running}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
          <SettingsPanel
            options={options}
            onChange={setOptions}
            disabled={running}
            resizeError={settingsError}
          />
        </section>
        {jobs.length > 0 && (
          <section className="action-bar" aria-label="Batch actions">
            <div>
              <strong>
                {preparingZip
                  ? 'Preparing ZIP'
                  : running
                    ? 'Converting'
                    : pendingCount
                      ? `${pendingCount} ready to convert`
                      : completed.length
                        ? `${completed.length} complete`
                        : 'No queued images'}
              </strong>
              <span>
                Files are processed sequentially. The first conversion loads the WebAssembly codec.
              </span>
              {settingsError && (
                <span className="file-error" role="alert">
                  {settingsError}
                </span>
              )}
              {completed.length > 1 && zipError && <span className="file-error">{zipError}</span>}
            </div>
            <div className="action-buttons">
              {completed.length > 1 && (
                <button
                  type="button"
                  className="button ghost"
                  disabled={!!zipError || preparingZip || running}
                  onClick={() => void downloadAll()}
                >
                  <Download size={17} /> {preparingZip ? 'Preparing ZIP' : 'Download all (.zip)'}
                </button>
              )}
              {running ? (
                <button type="button" className="button danger" onClick={cancel}>
                  <X size={17} /> Cancel
                </button>
              ) : pendingCount ? (
                <button
                  type="button"
                  className="button primary convert-button"
                  disabled={!!settingsError || preparingZip}
                  onClick={() => void convertAll()}
                >
                  Convert {pendingCount} {pendingCount === 1 ? 'image' : 'images'}
                </button>
              ) : (
                <button
                  type="button"
                  className="button primary convert-button"
                  disabled={preparingZip || jobs.some((job) => job.status === 'inspecting')}
                  onClick={requeueAll}
                >
                  Requeue batch
                </button>
              )}
            </div>
          </section>
        )}
        <div className="visually-hidden" aria-live="polite">
          {preparingZip
            ? 'Preparing ZIP'
            : running
              ? 'Conversion in progress'
              : completed.length
                ? `${completed.length} conversions complete`
                : ''}
        </div>
      </main>
      <footer>
        <span>Image Converter · MIT</span>
      </footer>
    </div>
  )
}
