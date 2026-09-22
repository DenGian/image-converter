try {
  const stored =
    localStorage.getItem('image-converter-theme') ||
    localStorage.getItem('local-lens-theme') ||
    'system'
  document.documentElement.dataset.theme =
    stored === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : stored
} catch {
  document.documentElement.dataset.theme = 'light'
}
