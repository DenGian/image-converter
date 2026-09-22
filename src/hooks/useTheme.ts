import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('local-lens-theme')
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system'
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme =
        theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
      document.documentElement.style.colorScheme = theme === 'system' ? 'light dark' : theme
    }
    apply()
    localStorage.setItem('local-lens-theme', theme)
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  return { theme, setTheme }
}
