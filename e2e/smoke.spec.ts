import { expect, test } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

test('converts and downloads under the GitHub Pages project path', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('./')
  await expect(page).toHaveTitle(/Local Lens/)
  await expect(page.getByRole('heading', { name: /Convert images/ })).toBeVisible()
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
  const fixture = Buffer.from(
    readFileSync(resolve('tests/fixtures/oriented-jpeg.base64'), 'utf8').trim(),
    'base64',
  )
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'portrait.jpg', mimeType: 'image/jpeg', buffer: fixture })
  await expect(page.getByText('Queued')).toBeVisible({ timeout: 20_000 })
  const wasmAsset = readdirSync(resolve('dist/assets')).find((name) => name.endsWith('.wasm'))
  expect(wasmAsset).toMatch(/^magick-.+\.wasm$/)
  if (!wasmAsset) throw new Error('Production WASM asset was not emitted')
  const wasmResponse = await page.request.get(
    `http://127.0.0.1:4173/image-converter/assets/${wasmAsset}`,
  )
  expect(wasmResponse.ok()).toBe(true)

  await page.getByRole('button', { name: 'Convert 1 image' }).click()
  await expect(page.getByText('Complete', { exact: true })).toBeVisible({ timeout: 20_000 })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download portrait.webp' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('portrait.webp')
  const downloadPath = await download.path()
  const bytes = readFileSync(downloadPath)
  expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
  expect(consoleErrors).toEqual([])
})
