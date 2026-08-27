import { expect, test } from '@playwright/test'

const password = 'DocFlowDemo2026!'
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('E-mail corporativo').fill('admin@docflow.demo')
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('O trabalho está fluindo.')).toBeVisible()
}

async function expectNoPageOverflow(page, label) {
  await page.waitForTimeout(150)
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
  }))
  expect(
    dimensions.document,
    `${label}: largura do documento (${dimensions.document}px) excedeu a viewport (${dimensions.viewport}px)`,
  ).toBeLessThanOrEqual(dimensions.viewport + 1)
}

async function openDocument(page, title) {
  await page.goto('/documents')
  await page.getByPlaceholder('Buscar por título…').fill(title)
  const titleLink = page.getByRole('link').filter({ hasText: title }).first()
  await expect(titleLink).toBeVisible()
  await titleLink.click()
  await expect(page.getByRole('heading', { name: title })).toBeVisible()
}

for (const viewport of viewports) {
  test(`layout responsivo e rotas principais — ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })
    const runtimeErrors = []
    page.on('pageerror', (error) => runtimeErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(message.text())
    })

    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Acesse seu workspace' })).toBeVisible()
    await expectNoPageOverflow(page, `${viewport.name}/login`)
    await login(page)
    await expectNoPageOverflow(page, `${viewport.name}/dashboard`)

    const menuButton = page.getByLabel('Abrir menu')
    if (viewport.width < 1024) {
      await expect(menuButton).toBeVisible()
      await menuButton.click()
      await expect(page.getByLabel('Fechar menu')).toBeVisible()
      await page.getByLabel('Fechar menu').click()
      await expect(page.getByLabel('Fechar menu')).toBeHidden()
    } else {
      await expect(menuButton).toBeHidden()
    }

    for (const route of ['/documents', '/documents/new', '/users']) {
      await page.goto(route)
      await expect(page.locator('main')).toBeVisible()
      if (route === '/documents') {
        await expect(
          page.getByRole('link').filter({ hasText: 'Política de Segurança da Informação' }).first(),
        ).toBeVisible()
      }
      if (route === '/documents/new') {
        await expect(page.getByRole('button', { name: 'Gravar mensagem' })).toBeVisible()
      }
      if (route === '/users') {
        await page.getByRole('button', { name: 'Cadastrar usuário' }).click()
        await expect(page.getByLabel('CPF')).toBeVisible()
        await expect(page.getByLabel('Repetir senha')).toBeVisible()
        await expectNoPageOverflow(page, `${viewport.name}${route}/modal`)
        await page.getByLabel('Fechar').click()
      }
      await expectNoPageOverflow(page, `${viewport.name}${route}`)
      if (process.env.QA_SCREENSHOTS === '1' && route === '/documents') {
        await page.screenshot({ path: testInfo.outputPath('documentos.png'), fullPage: true })
      }
    }

    await openDocument(page, 'Política de Segurança da Informação')
    const detailUrl = page.url()
    await expectNoPageOverflow(page, `${viewport.name}/detalhe`)
    if (process.env.QA_SCREENSHOTS === '1') {
      await page.screenshot({ path: testInfo.outputPath('detalhe.png'), fullPage: true })
    }

    await page.goto(`${new URL(detailUrl).pathname}/history`)
    await expect(page.getByRole('heading', { name: 'Trilha de auditoria' })).toBeVisible()
    await expectNoPageOverflow(page, `${viewport.name}/historico`)

    await page.goto(`${new URL(detailUrl).pathname}/compare`)
    await expect(page.getByRole('heading', { name: 'Comparar versões' })).toBeVisible()
    await expect(page.getByText('Trechos adicionados')).toBeVisible()
    await expectNoPageOverflow(page, `${viewport.name}/comparacao`)

    await openDocument(page, 'Política de Reembolso')
    await page.getByRole('link', { name: 'Editar' }).click()
    await expect(page.getByRole('heading', { name: 'Editar documento' })).toBeVisible()
    await expectNoPageOverflow(page, `${viewport.name}/edicao`)

    expect(runtimeErrors, `erros do navegador em ${viewport.name}`).toEqual([])
  })
}
