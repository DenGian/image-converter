import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

const inspect = vi.fn().mockResolvedValue({ width: 2, height: 3, frameCount: 1, format: 'PNG' })
const convert = vi.fn().mockResolvedValue({
  bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46]).buffer,
  width: 2,
  height: 3,
  frameCount: 1,
})
vi.mock('./codecs/workerClient', () => ({
  CodecWorkerClient: class {
    inspect = inspect
    convert = convert
    cancel() {}
    dispose() {}
  },
}))
import App from './App'

const png = () =>
  new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])],
    'sample.png',
    { type: 'image/png' },
  )

describe('App', () => {
  beforeEach(() => {
    inspect.mockClear()
    convert.mockClear()
  })
  it('adds, displays, and removes a file accessibly', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(screen.getByLabelText('Add images').querySelector('input')!, png())
    expect(await screen.findByText('sample.png')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove sample.png' }))
    expect(screen.queryByText('sample.png')).not.toBeInTheDocument()
  })
  it('changes output format and quality', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Output format'), 'jpeg')
    expect(screen.getByLabelText('Image quality')).toHaveValue('82')
    await user.click(screen.getByText('Advanced settings'))
    await user.clear(screen.getByLabelText('Resize width'))
    await user.type(screen.getByLabelText('Resize width'), '120')
    expect(screen.getByLabelText('Resize width')).toHaveValue(120)
  })
  it('converts a queued file and reports success', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(screen.getByLabelText('Add images').querySelector('input')!, png())
    await screen.findByText('Ready', { exact: true })
    await user.click(screen.getByRole('button', { name: /Convert 1 image/ }))
    await waitFor(() => expect(screen.getByText('Complete')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Download sample\.webp/ })).toBeInTheDocument()
  })
  it('surfaces inspection failures with the file name', async () => {
    inspect.mockRejectedValueOnce(new Error('Corrupted image data'))
    const user = userEvent.setup()
    render(<App />)
    await user.upload(screen.getByLabelText('Add images').querySelector('input')!, png())
    expect(await screen.findByText(/sample\.png: Corrupted image data/)).toHaveAttribute(
      'class',
      'file-error',
    )
    await user.click(screen.getByRole('button', { name: 'Requeue sample.png' }))
    expect(await screen.findByText('Ready', { exact: true })).toBeInTheDocument()
  })
  it('surfaces conversion failures with the file name', async () => {
    convert.mockRejectedValueOnce(new Error('Encoder unavailable'))
    const user = userEvent.setup()
    render(<App />)
    await user.upload(screen.getByLabelText('Add images').querySelector('input')!, png())
    await screen.findByText('Ready', { exact: true })
    await user.click(screen.getByRole('button', { name: /Convert 1 image/ }))
    expect(await screen.findByText(/sample\.png: Encoder unavailable/)).toBeInTheDocument()
  })
  it('warns before converting a multi-frame input', async () => {
    inspect.mockResolvedValueOnce({ width: 2, height: 3, frameCount: 4, format: 'GIF' })
    const user = userEvent.setup()
    render(<App />)
    await user.upload(screen.getByLabelText('Add images').querySelector('input')!, png())
    expect(await screen.findByText(/Contains 4 frames\/pages/)).toBeInTheDocument()
  })
  it('reconverts with new settings and replaces the old output URL', async () => {
    const user = userEvent.setup()
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    render(<App />)
    await user.upload(screen.getByLabelText('Add images').querySelector('input')!, png())
    await screen.findByText('Ready', { exact: true })
    await user.click(screen.getByRole('button', { name: 'Convert 1 image' }))
    await screen.findByText('Complete', { exact: true })
    await user.selectOptions(screen.getByLabelText('Output format'), 'jpeg')
    expect(screen.getByText(/Converted with WebP/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Reconvert sample.png' }))
    expect(revoke).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Convert 1 image' }))
    await screen.findByRole('button', { name: 'Download sample.jpg' })
    expect(screen.getByText(/Converted with JPEG/)).toBeInTheDocument()
    revoke.mockRestore()
  })
})
