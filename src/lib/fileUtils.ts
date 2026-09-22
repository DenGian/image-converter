import { CAPABILITIES, type OutputFormat } from '../formats'

export function humanFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 || value >= 10 ? 0 : 1)} ${units[exponent]}`
}

export function fileStem(name: string): string {
  const lastDot = name.lastIndexOf('.')
  return (lastDot > 0 ? name.slice(0, lastDot) : name).trim() || 'image'
}

export function uniqueOutputName(
  inputName: string,
  format: OutputFormat,
  usedNames: Set<string>,
): string {
  const extension = CAPABILITIES[format].extensions[0]
  const stem = fileStem(inputName)
  let candidate = `${stem}.${extension}`
  let counter = 2
  while (usedNames.has(candidate.toLowerCase())) {
    candidate = `${stem}-${counter}.${extension}`
    counter += 1
  }
  usedNames.add(candidate.toLowerCase())
  return candidate
}

export function percentageChange(before: number, after: number): string {
  if (before === 0) return '—'
  const change = Math.round(((after - before) / before) * 100)
  return `${change > 0 ? '+' : ''}${change}%`
}
