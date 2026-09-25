import { chromium } from 'playwright-core';

export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:8081';
export const API = process.env.E2E_API_URL ?? 'http://localhost:3333';
export const TIMEZONE = 'America/Sao_Paulo';

export async function launchBrowser() {
  return chromium.launch({ channel: 'chrome', headless: true });
}

export async function newPage(browser) {
  const context = await browser.newContext({ timezoneId: TIMEZONE });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  return page;
}

export function createStepper(log) {
  return async (name, fn) => {
    await fn();
    log(`OK ${name}`);
  };
}

export const radio = (page, group, name) =>
  page.getByRole('radiogroup', { name: group }).getByRole('radio', { name, exact: true });

export const field = (page, label) =>
  page.getByLabel(label, { exact: true }).filter({ visible: true });

export function uniqueEmail(prefix) {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
}

export function localDate(daysFromToday = 0) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Date.now() + daysFromToday * 86_400_000));
}

export async function signUp(
  page,
  name,
  email = uniqueEmail(name.replace(/\s/g, '.').toLowerCase()),
) {
  await page.goto(`${BASE}/sign-up`, { waitUntil: 'networkidle' });
  await field(page, 'Nome').fill(name);
  await field(page, 'E-mail').fill(email);
  await field(page, 'Senha').fill('senha-segura-123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
}

export async function signUpWithSpace(page, name) {
  await signUp(page, name);
  await page.getByRole('button', { name: 'Criar espaço' }).click();
  await page.getByRole('button', { name: 'Novo lançamento' }).waitFor();
  return page.url().split('?')[0];
}

export async function addTransaction(
  page,
  { income = false, description, amount, date, category, pending = false },
) {
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  if (income) {
    await radio(page, 'Tipo', 'Receita').click();
  }
  await field(page, 'Descrição').fill(description);
  await field(page, 'Valor (R$)').fill(amount);
  await field(page, 'Data').fill(date);
  await radio(page, 'Categoria', category).click();
  if (pending) {
    await radio(page, 'Situação', 'Pendente').click();
  }
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento salvo.').waitFor();
}

export const row = (page, type, description) =>
  page.getByRole('button', { name: new RegExp(`^${type}: ${description}`) });
