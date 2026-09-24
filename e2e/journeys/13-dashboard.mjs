import { addTransaction, field, newPage, row, signUpWithSpace } from '../helpers.mjs';

export default async function dashboardJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Painel Teste');
  const region = () => page.getByRole('region', { name: 'Resumo do mês' });
  const metric = (label, value) => region().getByLabel(`${label}: ${value}`, { exact: true });
  await step('an empty month shows zeros', () =>
    metric('Receitas realizadas', 'R$ 0,00').waitFor(),
  );
  await addTransaction(page, {
    income: true,
    description: 'Salário',
    amount: '5.000,00',
    date: '05/02/2026',
    category: 'Receitas',
  });
  await addTransaction(page, {
    description: 'Aluguel',
    amount: '1.850,00',
    date: '10/02/2026',
    category: 'Moradia',
  });
  await addTransaction(page, {
    description: 'Mercado',
    amount: '1.234,56',
    date: '12/02/2026',
    category: 'Alimentação',
  });
  await addTransaction(page, {
    description: 'Farmácia',
    amount: '200,00',
    date: '20/02/2026',
    category: 'Saúde',
    pending: true,
  });
  await addTransaction(page, {
    income: true,
    description: 'Freela',
    amount: '900,00',
    date: '25/02/2026',
    category: 'Receitas',
    pending: true,
  });
  await step('realized metrics use paid transactions', async () => {
    await metric('Receitas realizadas', 'R$ 5.000,00').waitFor();
    await metric('Despesas realizadas', 'R$ 3.084,56').waitFor();
    await metric('Resultado realizado', 'R$ 1.915,44').waitFor();
  });
  await step('forecast metrics use pending transactions', async () => {
    await metric('Receitas previstas', 'R$ 900,00').waitFor();
    await metric('Despesas previstas', 'R$ 200,00').waitFor();
  });
  await step('expenses by category exclude pending ones', async () => {
    await metric('Moradia', 'R$ 1.850,00').waitFor();
    await metric('Alimentação', 'R$ 1.234,56').waitFor();
    if (await metric('Saúde', 'R$ 200,00').count()) {
      throw new Error('pending counted as realized');
    }
  });
  await row(page, 'Despesa', 'Mercado').click();
  await page.getByRole('button', { name: 'Excluir lançamento' }).click();
  await page.getByRole('button', { name: 'Sim, excluir' }).click();
  await step('deleted transactions leave the metrics', () =>
    metric('Despesas realizadas', 'R$ 1.850,00').waitFor(),
  );
  await page.getByRole('button', { name: 'Atualizar saldo' }).first().click();
  await field(page, 'Saldo (R$)').fill('-300,00');
  await field(page, 'Data do saldo').fill('27/02/2026');
  await page.getByRole('button', { name: 'Salvar saldo' }).click();
  await step('a past month shows its month-end observed balance', () =>
    metric('Informado para 27/02/2026', '-R$ 300,00').waitFor(),
  );
}
