import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { DropZone } from './DropZone'

describe('DropZone', () => {
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard)
    else Reflect.deleteProperty(navigator, 'clipboard')
  })

  it('exposes one keyboard file picker and multiple selection', async () => {
    const user = userEvent.setup()
    const onFiles = vi.fn<(files: File[]) => void>()
    const { container } = render(<DropZone onFiles={onFiles} />)
    const picker = screen.getByRole('button', { name: 'Choose images' })
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toHaveAttribute('hidden')
    expect(input).toHaveAttribute('tabindex', '-1')
    expect(input).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getAllByRole('button').map((button) => button.textContent?.trim())).toEqual([
      'Choose images',
      'Paste',
    ])
    expect(input).toHaveAttribute('multiple')
    expect(input.accept).toContain('.heic')
    const click = vi.spyOn(input, 'click')
    picker.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')
    expect(click).toHaveBeenCalledTimes(2)
  })

  it('reads a clipboard image and reports an empty clipboard', async () => {
    const onFiles = vi.fn<(files: File[]) => void>()
    const user = userEvent.setup()
    const read = vi
      .fn()
      .mockResolvedValueOnce([
        {
          types: ['image/png'],
          getType: () =>
            Promise.resolve(new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' })),
        },
      ])
      .mockResolvedValueOnce([])
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { read } })
    render(<DropZone onFiles={onFiles} />)
    await user.click(screen.getByRole('button', { name: 'Paste image from clipboard' }))
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls.at(0)?.[0]?.[0]).toBeInstanceOf(File)
    await user.click(screen.getByRole('button', { name: 'Paste image from clipboard' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/No supported image/)
  })

  it('handles clipboard permission denial', async () => {
    const user = userEvent.setup()
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { read: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
    })
    render(<DropZone onFiles={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Paste image from clipboard' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/denied/)
  })
})
