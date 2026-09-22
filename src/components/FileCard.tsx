import { Check, Download, FileWarning, LoaderCircle, RotateCcw, Trash2, X } from 'lucide-react'
import { CAPABILITIES } from '../formats'
import { humanFileSize, percentageChange } from '../lib/fileUtils'
import type { ImageJob } from '../types'

interface FileCardProps {
  job: ImageJob
  onRemove: (id: string) => void
  onRetry: (id: string) => void
  onDownload: (job: ImageJob) => void
  locked?: boolean
}
const statusLabel: Record<ImageJob['status'], string> = {
  inspecting: 'Reading image',
  queued: 'Queued',
  converting: 'Converting',
  complete: 'Complete',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

export function FileCard({ job, onRemove, onRetry, onDownload, locked = false }: FileCardProps) {
  const preview = job.outputUrl ?? job.previewUrl
  return (
    <article
      className={`file-card status-${job.status}`}
      aria-label={`${job.file.name}: ${statusLabel[job.status]}`}
    >
      <div className="thumbnail">
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <span>{CAPABILITIES[job.detectedFormat].label}</span>
        )}
      </div>
      <div className="file-main">
        <div className="file-heading">
          <div>
            <h3 title={job.file.name}>{job.file.name}</h3>
            <p>
              {CAPABILITIES[job.detectedFormat].label} ·{' '}
              {job.dimensions
                ? `${job.dimensions.width} × ${job.dimensions.height}`
                : 'Reading dimensions'}{' '}
              · {humanFileSize(job.file.size)}
            </p>
          </div>
          <div className={`status-pill ${job.status}`}>
            {job.status === 'converting' || job.status === 'inspecting' ? (
              <LoaderCircle size={13} className="spin" />
            ) : job.status === 'complete' ? (
              <Check size={13} />
            ) : job.status === 'failed' ? (
              <FileWarning size={13} />
            ) : job.status === 'cancelled' ? (
              <X size={13} />
            ) : null}
            {statusLabel[job.status]}
          </div>
        </div>
        {(job.status === 'converting' || job.status === 'inspecting') && (
          <progress value={job.progress} max="100" aria-label={`${job.file.name} progress`}>
            {job.progress}%
          </progress>
        )}
        {job.warning && <p className="file-warning">{job.warning}</p>}
        {job.error && (
          <p className="file-error">
            {job.file.name}: {job.error}
          </p>
        )}
        {job.status === 'complete' && job.output && (
          <p className="size-result">
            {humanFileSize(job.file.size)} → <strong>{humanFileSize(job.output.size)}</strong>{' '}
            <span>{percentageChange(job.file.size, job.output.size)}</span>
          </p>
        )}
      </div>
      <div className="file-actions">
        {job.status === 'complete' && (
          <button
            type="button"
            className="icon-button"
            disabled={locked}
            onClick={() => onDownload(job)}
            aria-label={`Download ${job.outputName}`}
            title="Download"
          >
            <Download size={18} />
          </button>
        )}
        {(job.status === 'failed' || job.status === 'cancelled') && (
          <button
            type="button"
            className="icon-button"
            disabled={locked}
            onClick={() => onRetry(job.id)}
            aria-label={`Retry ${job.file.name}`}
            title="Retry"
          >
            <RotateCcw size={18} />
          </button>
        )}
        <button
          type="button"
          className="icon-button"
          disabled={locked}
          onClick={() => onRemove(job.id)}
          aria-label={`Remove ${job.file.name}`}
          title="Remove"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </article>
  )
}
