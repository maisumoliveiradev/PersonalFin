import { addTransaction, newPage, signUpWithSpace } from '../helpers.mjs';

export default async function listJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Lista Teste');
  await step('empty month is explicit', () =>
    page.getByText('Nenhum lançamento neste mês.').waitFor(),
  );
  await addTransaction(page, {
    description: 'Mercado do mês',
    amount: '1.234,56',
    date: '05/01/2026',
    category: 'Alimentação',
  });
  await step('new expense appears in the list', () => page.getByText('Mercado do mês').waitFor());
  await addTransaction(page, {
    income: true,
    description: 'Salário',
    amount: '5000',
    date: '20/01/2026',
    category: 'Receitas',
    pending: true,
  });
  await step('amounts are formatted in pt-BR with direction', async () => {
    await page.getByText('−R$ 1.234,56').waitFor();
    await page.getByText('+R$ 5.000,00').waitFor();
  });
  await step('dates are shown exactly as entered', async () => {
    await page.getByText('05/01/2026 · Alimentação').waitFor();
    await page.getByText('20/01/2026 · Receitas').waitFor();
  });
  await step('newest financial date comes first', async () => {
    const texts = await page.locator('text=/^(Salário|Mercado do mês)$/').allTextContents();
    if (texts.join('|') !== 'Salário|Mercado do mês') {
      throw new Error(texts.join('|'));
    }
  });
  await page.reload({ waitUntil: 'networkidle' });
  await step('list persists after reload', () => page.getByText('Mercado do mês').waitFor());
}
