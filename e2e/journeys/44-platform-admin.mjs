import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { BASE, uniqueEmail } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });
const API_DIR = path.join(import.meta.dirname, '..', '..', 'apps', 'api');

export default async function platformAdminJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const email = uniqueEmail('admin');
  await page.goto(`${BASE}/sign-up`, { waitUntil: 'networkidle' });
  await page.getByLabel('Nome', { exact: true }).fill('Admin Teste');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-segura-123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await page.getByRole('button', { name: 'Criar espaço' }).waitFor();

  await step('regular users do not see the platform administration', async () => {
    if ((await page.getByRole('button', { name: 'Administração da plataforma' }).count()) !== 0) {
      throw new Error('administration offered to a regular user');
    }
  });

  execFileSync('npm', ['run', '--silent', 'admin', '--', 'grant', email], { cwd: API_DIR });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Criar espaço' }).click();
  await visible(page.getByRole('button', { name: 'Trocar de espaço' })).click();
  await visible(page.getByRole('button', { name: 'Administração da plataforma' })).click();

  await step('an administrator sees only aggregate counts', async () => {
    await page.getByRole('heading', { name: 'Administração da plataforma' }).waitFor();
    await visible(page.getByText('Espaços que usam cada recurso')).waitFor();
    await visible(page.getByText(/^Migrações aplicadas: \d+ \(última: \d{4}_/)).waitFor();
    if ((await page.getByText(/R\$/).count()) !== 0) {
      throw new Error('monetary values shown in the administration');
    }
  });

  execFileSync('npm', ['run', '--silent', 'admin', '--', 'revoke', email], { cwd: API_DIR });
}
