import { BASE, field, newPage, uniqueEmail } from '../helpers.mjs';

export default async function authJourney({ browser, step }) {
  const page = await newPage(browser);
  const email = uniqueEmail('auth');
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await step('unauthenticated user lands on sign-in', () =>
    page.getByRole('heading', { name: 'Entrar' }).waitFor(),
  );
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await step('empty submit shows validation', () =>
    page.getByText('Preencha todos os campos.').waitFor(),
  );
  await page.getByRole('button', { name: 'Ainda não tem conta? Criar conta' }).click();
  await field(page, 'Nome').fill('Maria Web');
  await field(page, 'E-mail').fill(email);
  await field(page, 'Senha').fill('senha-segura-123');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
  await step('sign-up enters the protected area', () =>
    page.getByText('Olá, Maria Web!').waitFor(),
  );
  await page.reload({ waitUntil: 'networkidle' });
  await step('session is restored after reload', () => page.getByText('Olá, Maria Web!').waitFor());
  await page.getByRole('button', { name: 'Sair' }).click();
  await step('sign-out returns to sign-in', () =>
    page.getByRole('heading', { name: 'Entrar' }).waitFor(),
  );
  await field(page, 'E-mail').fill(email);
  await field(page, 'Senha').fill('senha-errada-000');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await step('wrong password shows an error', () =>
    page.getByText('E-mail ou senha incorretos.').waitFor(),
  );
  await field(page, 'Senha').fill('senha-segura-123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await step('sign-in enters the protected area', () =>
    page.getByText('Olá, Maria Web!').waitFor(),
  );
}
