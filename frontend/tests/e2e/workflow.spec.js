import { expect, test } from '@playwright/test'

const title = 'Plano de Continuidade Operacional E2E'
const password = 'DocFlowDemo2026!'

async function login(page, email) {
  await page.goto('/login')
  await page.getByLabel('E-mail corporativo').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('O trabalho está fluindo.')).toBeVisible()
}

test.describe.serial('DocFlow approval lifecycle', () => {
  test('Flow 1 — admin creates a document and submits it', async ({ page }) => {
    await login(page, 'admin@docflow.demo')
    await page.getByRole('link', { name: 'Novo documento' }).first().click()
    await page.getByLabel('Título').fill(title)
    await page.getByLabel('Categoria').selectOption('Operações')
    await page.getByLabel('Revisor').selectOption({ label: 'Bruno Costa' })
    await page.getByLabel('Descrição').fill('Plano validado para o fluxo de demonstração E2E.')
    await page.locator('#content').fill('O plano de continuidade deve ser testado semestralmente.')
    await page.getByLabel('Resumo das alterações').fill('Versão inicial para revisão')
    await page.getByRole('button', { name: 'Criar rascunho' }).click()
    await expect(page.getByRole('heading', { name: title })).toBeVisible()
    await page.getByRole('button', { name: 'Enviar para revisão' }).click()
    await page.getByRole('button', { name: 'Enviar agora' }).click()
    await expect(page.getByText('Em revisão')).toBeVisible()
  })

  test('Flow 2 — collaborator requests changes on assigned review', async ({ page }) => {
    await login(page, 'collaborator@docflow.demo')
    await page.getByRole('link', { name: 'Documentos' }).click()
    await page.getByPlaceholder('Buscar por título…').fill(title)
    await page.getByText(title).first().click()
    await page.getByRole('button', { name: 'Solicitar ajustes' }).click()
    await page
      .getByLabel('Orientação para o autor')
      .fill('Inclua o responsável pelo teste e o prazo de evidência.')
    await page.getByRole('button', { name: 'Solicitar ajustes' }).last().click()
    await expect(page.getByText('Ajustes solicitados', { exact: true })).toBeVisible()
  })

  test('Flow 3 — admin versions, resubmits, approves and publishes', async ({ page }) => {
    await login(page, 'admin@docflow.demo')
    await page.getByRole('link', { name: 'Documentos' }).click()
    await page.getByPlaceholder('Buscar por título…').fill(title)
    await page.getByText(title).first().click()
    await page.getByRole('link', { name: 'Editar' }).click()
    await page
      .locator('#content')
      .fill(
        'O plano de continuidade deve ser testado semestralmente. Bruno Costa é responsável pela evidência em até cinco dias úteis.',
      )
    await page.getByLabel('Resumo das alterações').fill('Responsável e prazo adicionados')
    await page.getByRole('button', { name: 'Salvar alterações' }).click()
    await expect(page.getByText('v1.1').first()).toBeVisible()
    await page.getByRole('button', { name: 'Enviar para revisão' }).click()
    await page.getByRole('button', { name: 'Enviar agora' }).click()
    await page.getByRole('button', { name: 'Aprovar' }).click()
    await page.getByRole('button', { name: 'Aprovar' }).last().click()
    await page.getByRole('button', { name: 'Publicar' }).click()
    await page.getByRole('button', { name: 'Publicar' }).last().click()
    await expect(page.getByText('Publicado').first()).toBeVisible()
  })
})
