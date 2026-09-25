import { addTransaction, newPage, signUpWithSpace } from '../helpers.mjs';

export default async function analyticsJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Analises Teste');
  await addTransaction(page, {
    description: 'Setembro',
    amount: '100,00',
    date: '10/09/2026',
    category: 'Moradia',
  });
  await addTransaction(page, {
    description: 'Outubro',
    amount: '110,00',
    date: '10/10/2026',
    category: 'Moradia',
  });
  await addTransaction(page, {
    income: true,
    description: 'Salário',
    amount: '300,00',
    date: '05/10/2026',
    category: 'Receitas',
  });

  await page.getByRole('button', { name: 'Análises' }).click();
  await page.getByRole('region', { name: 'Comparação' }).waitFor();
  await page.goto(`${spaceUrl}/analytics?month=2026-10`, { waitUntil: 'networkidle' });
  const comparison = page.getByRole('region', { name: 'Comparação' });
  await step('a month is compared with the previous month and year', () =>
    comparison
      .getByLabel(
        'Despesas realizadas: R$ 110,00; vs. setembro de 2026: +R$ 10,00 (+10,0%); vs. outubro de 2025: +R$ 110,00',
        { exact: true },
      )
      .waitFor(),
  );
  await step('a zero base has no percentage', () =>
    comparison
      .getByLabel(
        'Receitas realizadas: R$ 300,00; vs. setembro de 2026: +R$ 300,00; vs. outubro de 2025: +R$ 300,00',
        { exact: true },
      )
      .waitFor(),
  );
  const evolution = page.getByRole('region', { name: 'Evolução (12 meses)' });
  await step('the evolution lists each month with exact values', async () => {
    await evolution
      .getByLabel(
        'outubro de 2026: Receitas R$ 300,00 · Despesas R$ 110,00 · Resultado R$ 190,00',
        { exact: true },
      )
      .waitFor();
    await evolution
      .getByLabel(
        'setembro de 2026: Receitas R$ 0,00 · Despesas R$ 100,00 · Resultado -R$ 100,00',
        { exact: true },
      )
      .waitFor();
    const months = await evolution.getByLabel(/ de 20\d\d: Receitas/).count();
    if (months !== 12) {
      throw new Error(`${months} months listed`);
    }
  });
  await page.getByRole('button', { name: 'Mês anterior' }).click();
  await step('navigating months updates the comparison', () =>
    comparison
      .getByLabel(/^Despesas realizadas: R\$.100,00; vs\. agosto de 2026: \+R\$.100,00;/)
      .waitFor(),
  );
}
