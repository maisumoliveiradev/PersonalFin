import { execFileSync } from 'node:child_process';
import path from 'node:path';

import {
  addTransaction,
  BASE,
  field,
  localDate,
  row,
  signUp,
  signUpWithSpace,
  uniqueEmail,
} from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });
const API_DIR = path.join(import.meta.dirname, '..', '..', 'apps', 'api');

async function person(browser) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  return page;
}

export default async function supportAccessJourney({ browser, step }) {
  const owner = await person(browser);
  const spaceUrl = await signUpWithSpace(owner, 'Dona Teste');
  await addTransaction(owner, {
    description: 'Aluguel',
    amount: '1.500,00',
    date: localDate(),
    category: 'Moradia',
  });

  const admin = await person(browser);
  const adminEmail = uniqueEmail('suporte');
  await signUp(admin, 'Suporte Teste', adminEmail);
  await admin.getByRole('button', { name: 'Criar espaço' }).waitFor();
  execFileSync('npm', ['run', '--silent', 'admin', '--', 'grant', adminEmail], { cwd: API_DIR });

  await admin.goto(spaceUrl, { waitUntil: 'networkidle' });
  await step('an administrator cannot open a space without authorization', async () => {
    await visible(admin.getByText('Espaço não encontrado', { exact: false })).waitFor();
  });

  await visible(owner.getByRole('button', { name: 'Membros' })).click();
  await field(owner, 'E-mail do administrador').fill(adminEmail);
  await field(owner, 'Motivo (por exemplo, o número do chamado)').fill(
    'Chamado 42: conferir saldo',
  );
  await owner.getByRole('button', { name: 'Autorizar acesso' }).click();
  await step('the Owner authorizes read-only support access', async () => {
    await owner.getByText('Acesso autorizado.').waitFor();
    await owner.getByText(new RegExp(`^${adminEmail.replace(/\./g, '\\.')} · ativo até`)).waitFor();
  });

  await admin.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await admin.getByRole('button', { name: 'Abrir Pessoal (somente leitura)' }).click();
  await step('the administrator views the space read-only', async () => {
    await visible(admin.getByText('Suporte (somente leitura)')).waitFor();
    await visible(row(admin, 'Despesa', 'Aluguel')).waitFor();
    if ((await visible(admin.getByRole('button', { name: 'Novo lançamento' })).count()) !== 0) {
      throw new Error('support access offered a write action');
    }
  });

  await owner.goto(`${spaceUrl}/audit`, { waitUntil: 'networkidle' });
  await step('each support access appears in the Owner audit history', async () => {
    await visible(
      owner.getByLabel(/Suporte Teste · Acesso do suporte: acesso do suporte/).first(),
    ).waitFor();
  });

  await owner.goto(`${spaceUrl}/members`, { waitUntil: 'networkidle' });
  await owner.getByRole('button', { name: `Revogar acesso de ${adminEmail}` }).click();
  await owner.getByText('Acesso revogado.').waitFor();
  await admin.goto(spaceUrl, { waitUntil: 'networkidle' });
  await step('revoking ends the access immediately', async () => {
    await visible(admin.getByText('Espaço não encontrado', { exact: false })).waitFor();
  });

  execFileSync('npm', ['run', '--silent', 'admin', '--', 'revoke', adminEmail], { cwd: API_DIR });
}
