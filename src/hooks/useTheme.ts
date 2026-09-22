import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'image-converter-theme'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('local-lens-theme')
    } catch {
      /* Storage can be disabled by the browser. */
    }
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  })
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      setSystemDark(media.matches)
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.style.colorScheme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    apply()
    try {
      localStorage.setItem(STORAGE_KEY, theme)
      localStorage.removeItem('local-lens-theme')
    } catch {
      /* Keep the in-memory preference. */
    }
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return {
    theme,
    resolvedTheme: theme === 'system' ? (systemDark ? 'dark' : 'light') : theme,
    setTheme,
  }
}
