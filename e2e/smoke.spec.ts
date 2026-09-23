import { expect, test } from '@playwright/test'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import JSZip from 'jszip'

test('converts and downloads at the production root', async ({ page }) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('./')
  const entry = await page.request.get('/')
  expect(entry.headers()['content-security-policy']).toContain("'wasm-unsafe-eval'")
  expect(entry.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  await expect(page).toHaveTitle(/Image Converter/)
  await expect(page.getByRole('heading', { name: /Convert images/ })).toBeVisible()
  await expect(page.locator('input[type="file"]')).toBeHidden()
  await expect(page.getByRole('button', { name: '', exact: true })).toHaveCount(0)
  const dropZoneTree = await page.locator('section[aria-label="Add images"]').ariaSnapshot()
  expect(dropZoneTree).toContain('button "Choose images"')
  expect(dropZoneTree).not.toMatch(/- button:\s*(?:\n|$)/)
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  const fixture = Buffer.from(
    readFileSync(resolve('tests/fixtures/oriented-jpeg.base64'), 'utf8').trim(),
    'base64',
  )
  await page
    .locator('input[type="file"]')
    .setInputFiles({ name: 'portrait.jpg', mimeType: 'image/jpeg', buffer: fixture })
  await expect(page.getByText('Ready', { exact: true })).toBeVisible({ timeout: 20_000 })
  const sourcePreview = await page.locator('.file-card .thumbnail img').getAttribute('src')
  expect(sourcePreview).toMatch(/^blob:/)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  const wasmAsset = readdirSync(resolve('dist/assets')).find((name) => name.endsWith('.wasm'))
  expect(wasmAsset).toMatch(/^magick-.+\.wasm$/)
  if (!wasmAsset) throw new Error('Production WASM asset was not emitted')
  const wasmResponse = await page.request.get(`http://127.0.0.1:4173/assets/${wasmAsset}`)
  expect(wasmResponse.ok()).toBe(true)

  await page.getByRole('button', { name: 'Convert 1 image' }).click()
  await expect(page.getByText('Complete', { exact: true })).toBeVisible({ timeout: 20_000 })
  await expect(page.locator('.file-card .thumbnail img')).not.toHaveAttribute('src', sourcePreview!)
  await expect
    .poll(() =>
      page
        .locator('.file-card .thumbnail img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  if (process.env.CAPTURE_DOCS && test.info().project.name.startsWith('chromium')) {
    const desktop = test.info().project.name === 'chromium-desktop'
    await page.setViewportSize(desktop ? { width: 1200, height: 800 } : { width: 390, height: 844 })
    await page.screenshot({
      path: `docs/assets/${desktop ? 'desktop' : 'mobile'}.png`,
      fullPage: true,
    })
    if (desktop) {
      await page.setViewportSize({ width: 1200, height: 630 })
      await page.screenshot({ path: 'public/og-image.png' })
      await page.screenshot({ path: 'docs/assets/social-preview.png' })
    }
  }
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download portrait.webp' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('portrait.webp')
  const downloadPath = await download.path()
  const bytes = readFileSync(downloadPath)
  expect(bytes.subarray(8, 12).toString()).toBe('WEBP')
  await page.getByRole('button', { name: 'Clear outputs' }).click()
  await expect(page.getByText('Ready', { exact: true })).toBeVisible()
  await expect(page.locator('.file-card .thumbnail img')).toHaveAttribute('src', sourcePreview!)
  await expect
    .poll(() =>
      page
        .locator('.file-card .thumbnail img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0)
  expect(consoleErrors).toEqual([])
})

test('serves canonical and social preview metadata', async ({ page }) => {
  await page.goto('./')
  const site = 'https://image-converter-two-eta.vercel.app/'
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', site)
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', site)
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]'])
    await expect(page.locator(selector)).toHaveAttribute('content', `${site}og-image.png`)
  const image = await page.request.get('/og-image.png')
  expect(image.ok()).toBe(true)
  expect(image.headers()['content-type']).toContain('image/png')
})

test('narrow keyboard and invalid-input states', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('./')
  const picker = page.getByRole('button', { name: 'Choose images' })
  await picker.focus()
  await expect(picker).toBeFocused()
  const chooser = page.waitForEvent('filechooser')
  await picker.press('Enter')
  expect((await chooser).isMultiple()).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await page.getByText('Advanced settings').click()
  await page.getByLabel('Resize width').fill('9000')
  await expect(page.getByText(/Width must be at most 8192/)).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  const overflow = await page.evaluate(() =>
    Array.from(document.querySelectorAll('body *'))
      .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
      .map((element) => `${element.tagName.toLowerCase()}.${element.getAttribute('class') ?? ''}`),
  )
  expect(overflow).toEqual([])
})

test('stores duplicate-named outputs safely in a ZIP', async ({ page }) => {
  const fixture = Buffer.from(
    readFileSync(resolve('tests/fixtures/oriented-jpeg.base64'), 'utf8').trim(),
    'base64',
  )
  await page.goto('./')
  await page.locator('input[type="file"]').setInputFiles([
    { name: 'same.jpg', mimeType: 'image/jpeg', buffer: fixture },
    { name: 'same.jpg', mimeType: 'image/jpeg', buffer: fixture },
  ])
  await expect(page.getByText('Ready', { exact: true })).toHaveCount(2, { timeout: 20_000 })
  await page.getByRole('button', { name: 'Convert 2 images' }).click()
  await expect(page.getByText('Complete', { exact: true })).toHaveCount(2, { timeout: 20_000 })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download all (.zip)' }).click()
  const download = await downloadPromise
  const zip = await JSZip.loadAsync(readFileSync(await download.path()))
  expect(Object.keys(zip.files).sort()).toEqual(['same-2.webp', 'same.webp'])
})

test('reports a corrupted image accessibly', async ({ page }) => {
  await page.goto('./')
  await page.locator('input[type="file"]').setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
  })
  await expect(page.getByText(/broken\.png: /)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText('Failed', { exact: true })).toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
})

test('resolves system, light, and dark theme with accessible contrast', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('./')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const theme = page.getByRole('combobox', { name: 'Theme preference' })
  await theme.selectOption('light')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await theme.selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await theme.selectOption('system')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('keyboard traversal reaches the converter controls in order', async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium-desktop')
  await page.goto('./')
  for (const name of [
    'Image Converter home',
    'Formats',
    'Theme preference',
    'View source on GitHub',
    'Choose images',
    'Paste image from clipboard',
  ]) {
    await page.keyboard.press('Tab')
    await expect(
      page.getByRole(
        name === 'Theme preference'
          ? 'combobox'
          : name === 'Choose images' || name === 'Paste image from clipboard'
            ? 'button'
            : 'link',
        { name },
      ),
    ).toBeFocused()
  }
  const outline = await page
    .getByRole('button', { name: 'Paste image from clipboard' })
    .evaluate((element) => getComputedStyle(element).outlineStyle)
  expect(outline).not.toBe('none')
})
