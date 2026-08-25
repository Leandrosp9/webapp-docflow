import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173'
const outputDirectory = fileURLToPath(new URL('../../docs/screenshots/', import.meta.url))

await mkdir(outputDirectory, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({
  viewport: { width: 1440, height: 1024 },
  deviceScaleFactor: 1,
})

try {
  await page.goto(`${baseURL}/login`)
  await page.locator('#email').fill('admin@docflow.demo')
  await page.locator('#password').fill('DocFlowDemo2026!')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL('**/dashboard')
  await page.getByRole('heading', { name: 'O trabalho está fluindo.' }).waitFor()
  await page.screenshot({ path: `${outputDirectory}/dashboard.png` })

  await page.goto(`${baseURL}/documents`)
  await page.getByRole('heading', { name: 'Biblioteca de documentos' }).waitFor()
  await page.getByPlaceholder('Buscar por título…').fill('Política de Segurança da Informação')
  await page.getByText('Política de Segurança da Informação', { exact: true }).first().click()
  await page.getByRole('heading', { name: 'Política de Segurança da Informação' }).waitFor()
  await page.screenshot({ path: `${outputDirectory}/documento.png`, fullPage: true })
} finally {
  await browser.close()
}
