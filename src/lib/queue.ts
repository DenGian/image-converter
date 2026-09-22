import type { ImageJob, JobStatus } from '../types'

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  inspecting: ['queued', 'failed', 'cancelled'],
  queued: ['converting', 'cancelled'],
  converting: ['complete', 'failed', 'cancelled'],
  complete: ['queued'],
  failed: ['queued'],
  cancelled: ['queued'],
}

export function transitionJob(job: ImageJob, status: JobStatus): ImageJob {
  if (!TRANSITIONS[job.status].includes(status)) {
    throw new Error(`Invalid job transition: ${job.status} → ${status}`)
  }
  return { ...job, status }
}
