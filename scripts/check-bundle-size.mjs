import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const budgets = [
  [/^index-.*\.js$/, 350_000],
  [/^converter\.worker-.*\.js$/, 300_000],
  [/^zip\.worker-.*\.js$/, 160_000],
  [/^magick-.*\.wasm$/, 16_000_000],
]
const files = readdirSync('dist/assets')
let failed = false
for (const [pattern, limit] of budgets) {
  const name = files.find((entry) => pattern.test(entry))
  if (!name) {
    console.error(`Missing asset: ${pattern}`)
    failed = true
    continue
  }
  const bytes = statSync(join('dist/assets', name)).size
  console.log(`${name}: ${bytes} bytes (budget ${limit})`)
  if (bytes > limit) failed = true
}
if (failed) process.exitCode = 1
