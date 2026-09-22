import type { ConversionOptions, ImageDimensions } from '../types'

export interface InspectResult extends ImageDimensions {
  frameCount: number
  format: string
}

export type WorkerRequest =
  | { id: string; type: 'inspect'; bytes: ArrayBuffer }
  | { id: string; type: 'convert'; bytes: ArrayBuffer; options: ConversionOptions }

export type WorkerResponse =
  | { id: string; type: 'progress'; progress: number }
  | { id: string; type: 'inspected'; result: InspectResult }
  | {
      id: string
      type: 'converted'
      bytes: ArrayBuffer
      width: number
      height: number
      frameCount: number
    }
  | { id: string; type: 'error'; message: string }
