import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTheme } from './useTheme'

function ThemeProbe() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <>
      <span data-testid="resolved">{resolvedTheme}</span>
      <select
        aria-label="Theme"
        value={theme}
        onChange={(event) => setTheme(event.target.value as typeof theme)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </>
  )
}

it('persists three-state preference and follows system changes', async () => {
  localStorage.clear()
  let dark = false
  const observer: { listener: () => void } = { listener: () => undefined }
  const original = window.matchMedia.bind(window)
  window.matchMedia = () =>
    ({
      get matches() {
        return dark
      },
      addEventListener: (_type: string, callback: () => void) => {
        observer.listener = callback
      },
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
  try {
    const user = userEvent.setup()
    render(<ThemeProbe />)
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
    await user.selectOptions(screen.getByLabelText('Theme'), 'dark')
    expect(localStorage.getItem('image-converter-theme')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    await user.selectOptions(screen.getByLabelText('Theme'), 'system')
    act(() => {
      dark = true
      observer.listener()
    })
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(localStorage.getItem('image-converter-theme')).toBe('system')
  } finally {
    window.matchMedia = original
  }
})
