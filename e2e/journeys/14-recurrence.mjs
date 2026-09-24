import { field, newPage, radio, signUpWithSpace } from '../helpers.mjs';

export default async function recurrenceJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Recorrencia Teste');

  async function newSeries({ description, amount, date, category, repeat, rule }) {
    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    await field(page, 'Descrição').fill(description);
    await field(page, 'Valor (R$)').fill(amount);
    await field(page, 'Data').fill(date);
    await radio(page, 'Categoria', category).click();
    await radio(page, 'Repetir', repeat).click();
    if (rule) {
      await radio(page, 'Se cair em fim de semana ou feriado', rule).click();
    }
    await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  }

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await step('status is hidden once the entry repeats', async () => {
    await radio(page, 'Situação', 'Pago').waitFor();
    await radio(page, 'Repetir', 'Mensal').click();
    await radio(page, 'Situação', 'Pago').waitFor({ state: 'detached' });
  });
  await field(page, 'Descrição').fill('Aluguel');
  await field(page, 'Valor (R$)').fill('1.850,00');
  await field(page, 'Data').fill('05/01/2026');
  await radio(page, 'Categoria', 'Moradia').click();
  await field(page, 'Termina em (opcional)').fill('01/01/2026');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await step('an end date before the start is rejected', () =>
    page.getByText('A data de término deve ser igual ou posterior', { exact: false }).waitFor(),
  );
  await field(page, 'Termina em (opcional)').fill('');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await step('a monthly series is created with forecast occurrences', async () => {
    await page.getByText(/Recorrência criada com \d+ lançamentos previstos\./).waitFor();
    await page.getByRole('heading', { name: 'Janeiro de 2026' }).waitFor();
    await page.getByText('05/01/2026 · Moradia · ↻ Recorrente').waitFor();
    await page.getByRole('button', { name: 'Marcar como pago: Aluguel' }).waitFor();
  });
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await step('the next month has its own pending occurrence', () =>
    page.getByText('05/02/2026 · Moradia · ↻ Recorrente').waitFor(),
  );
  await newSeries({
    description: 'Academia',
    amount: '99,90',
    date: '07/03/2026',
    category: 'Saúde',
    repeat: 'Mensal',
    rule: 'Próximo dia útil',
  });
  await step('weekend occurrences move to the next business day', () =>
    page.getByText('09/03/2026 · Saúde · ↻ Recorrente').waitFor(),
  );
  await page.getByRole('button', { name: 'Marcar como pago: Academia' }).click();
  await page.getByRole('button', { name: 'Marcar como pendente: Academia' }).waitFor();
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await step('paying one occurrence leaves the next one pending', () =>
    page.getByRole('button', { name: 'Marcar como pago: Academia' }).waitFor(),
  );
  await page.goto(`${spaceUrl}?month=2028-05`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await step('browsing beyond the horizon creates the missing occurrences', () =>
    page.getByText('05/06/2028 · Moradia · ↻ Recorrente').waitFor(),
  );
  await page.getByRole('button', { name: 'Recorrências' }).click();
  await step('the series screen lists both series', async () => {
    await page.getByText('Mensal · desde 05/01/2026 · sem data de término').waitFor();
    await page.getByText('Mensal · desde 07/03/2026 · sem data de término').waitFor();
  });
}
