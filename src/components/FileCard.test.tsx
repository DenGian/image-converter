import { render, screen } from '@testing-library/react'
import { CAPABILITIES, OUTPUT_FORMATS } from '../formats'
import type { ImageJob } from '../types'
import { FileCard } from './FileCard'

const job: ImageJob = {
  id: 'sample',
  file: new File(['source'], 'sample.png', { type: 'image/png' }),
  detectedFormat: 'png',
  dimensions: { width: 2, height: 3 },
  frameCount: 1,
  previewUrl: 'blob:source',
  status: 'complete',
  progress: 100,
  error: null,
  warning: null,
  output: new Blob(['result']),
  outputUrl: 'blob:output',
  outputName: 'sample.webp',
  outputFormat: 'webp',
  outputDimensions: { width: 2, height: 3 },
  outputOptions: {
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
  },
}

it.each(OUTPUT_FORMATS)('reports only applicable settings for %s', (format) => {
  render(
    <FileCard
      job={{ ...job, outputFormat: format, outputOptions: { ...job.outputOptions!, format } }}
      onRemove={() => undefined}
      onRetry={() => undefined}
      onDownload={() => undefined}
    />,
  )
  const summary = screen.getByText(/Converted with/)
  expect(summary).toHaveTextContent(
    `Converted with ${CAPABILITIES[format].label}${CAPABILITIES[format].lossy ? ', quality 82' : ''}, metadata stripped.`,
  )
})
