// @vitest-environment node
import { readFileSync } from 'node:fs'

interface Header {
  key: string
  value: string
}
interface Rule {
  source: string
  headers: Header[]
}
const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as { headers: Rule[] }

function headersFor(path: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const rule of config.headers)
    if (new RegExp(`^${rule.source}$`).test(path))
      for (const header of rule.headers) values.set(header.key, header.value)
  return values
}

it('configures production CSP and cache policy for root assets', () => {
  const html = headersFor('/')
  expect(html.get('X-Content-Type-Options')).toBe('nosniff')
  expect(html.get('Referrer-Policy')).toBeTruthy()
  expect(html.get('Permissions-Policy')).toBeTruthy()
  expect(html.get('Content-Security-Policy')).toContain("'wasm-unsafe-eval'")
  expect(html.get('Content-Security-Policy')).toContain("frame-ancestors 'none'")
  expect(html.get('Content-Security-Policy')).toContain('blob:')
  expect(html.has('X-XSS-Protection')).toBe(false)
  expect(html.get('Cache-Control')).toContain('must-revalidate')
  expect(headersFor('/index.html').get('Cache-Control')).toContain('must-revalidate')
  expect(headersFor('/assets/magick-hash.wasm').get('Cache-Control')).toContain('immutable')
  expect(headersFor('/site.webmanifest').get('Cache-Control')).toContain('must-revalidate')
})
