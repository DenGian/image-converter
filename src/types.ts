import type { InputFormat, OutputFormat } from './formats'

export type JobStatus = 'inspecting' | 'queued' | 'converting' | 'complete' | 'failed' | 'cancelled'

export interface ImageDimensions {
  width: number
  height: number
}

export interface ResizeOptions {
  width: number | null
  height: number | null
  fit: 'contain' | 'cover'
  preserveAspectRatio: boolean
  neverUpscale: boolean
}

export interface ConversionOptions {
  format: OutputFormat
  quality: number
  background: string
  stripMetadata: boolean
  resize: ResizeOptions
}

export interface ImageJob {
  id: string
  file: File
  detectedFormat: InputFormat
  dimensions: ImageDimensions | null
  frameCount: number
  previewUrl: string | null
  status: JobStatus
  progress: number
  error: string | null
  warning: string | null
  output: Blob | null
  outputUrl: string | null
  outputName: string | null
  outputFormat: OutputFormat | null
}
