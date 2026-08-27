import { expect, test } from '@playwright/test'

const password = 'DocFlowDemo2026!'
const suffix = Date.now().toString().slice(-8)
const name = `Marina QA ${suffix}`
const updatedName = `Marina Souza QA ${suffix}`
const email = `marina.qa.${suffix}@docflow.demo`

function generateCpf(base) {
  const digits = base.padStart(9, '0').slice(-9).split('').map(Number)
  const digit = (length) => {
    const total = digits
      .slice(0, length)
      .reduce((sum, number, index) => sum + number * (length + 1 - index), 0)
    const remainder = total % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  digits.push(digit(9))
  digits.push(digit(10))
  return digits.join('')
}

async function login(page) {
  await page.goto('/login')
  await page.getByLabel('E-mail corporativo').fill('admin@docflow.demo')
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('O trabalho está fluindo.')).toBeVisible()
}

test('admin cadastra, edita, inativa, reativa e exclui usuário sem histórico', async ({ page }) => {
  await login(page)
  await page.goto('/users')
  await page.getByRole('button', { name: 'Cadastrar usuário' }).click()
  await page.getByLabel('Nome completo').fill(name)
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('CPF').fill(generateCpf(suffix))
  await page.getByLabel('Senha temporária').fill('SenhaTemporaria2026!')
  await page.getByLabel('Repetir senha').fill('SenhaTemporaria2026!')
  await page.getByRole('button', { name: 'Cadastrar', exact: true }).click()
  await expect(page.getByText(name).last()).toBeVisible()

  await page.getByLabel(`Editar ${name}`).last().click()
  await page.getByLabel('Nome completo').fill(updatedName)
  await page.getByLabel('Nova senha').fill('NovaSenhaMarina2026!')
  await page.getByLabel('Repetir senha').fill('NovaSenhaMarina2026!')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText(updatedName).last()).toBeVisible()

  await page.getByLabel(`Inativar ${updatedName}`).last().click()
  await page.getByRole('button', { name: 'Inativar', exact: true }).click()
  await expect(page.getByLabel(`Ativar ${updatedName}`).last()).toBeVisible()

  await page.getByLabel(`Ativar ${updatedName}`).last().click()
  await page.getByRole('button', { name: 'Reativar', exact: true }).click()
  await expect(page.getByLabel(`Inativar ${updatedName}`).last()).toBeVisible()

  await page.getByLabel(`Excluir ${updatedName}`).last().click()
  await page.getByRole('button', { name: 'Excluir permanentemente', exact: true }).click()
  await expect(page.getByText(updatedName)).toHaveCount(0)
})
