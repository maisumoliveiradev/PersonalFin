import { addTransaction, localDate, newPage, radio, signUpWithSpace } from '../helpers.mjs';

export default async function commitmentsJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Compromisso Teste');
  await addTransaction(page, {
    description: 'Conta atrasada',
    amount: '100,00',
    date: localDate(-5),
    category: 'Moradia',
    pending: true,
  });
  await addTransaction(page, {
    description: 'Internet',
    amount: '120,00',
    date: localDate(3),
    category: 'Serviços',
    pending: true,
  });
  await addTransaction(page, {
    income: true,
    description: 'Freela',
    amount: '900,00',
    date: localDate(10),
    category: 'Receitas',
    pending: true,
  });
  await addTransaction(page, {
    description: 'Pago hoje',
    amount: '50,00',
    date: localDate(0),
    category: 'Lazer',
  });
  await addTransaction(page, {
    description: 'Seguro',
    amount: '500,00',
    date: localDate(60),
    category: 'Serviços',
    pending: true,
  });

  await page.getByRole('button', { name: 'Próximos compromissos' }).click();
  const total = (label, value) => page.getByLabel(`${label}: R$ ${value}`, { exact: true });
  await step('overdue pending items are listed separately', async () => {
    await page.getByRole('heading', { name: 'Atrasados' }).waitFor();
    await page.getByText('Conta atrasada').filter({ visible: true }).waitFor();
    await total('Despesas a pagar', '100,00').waitFor();
  });
  await step('the next 30 days show only pending items with exact totals', async () => {
    await page.getByText('Internet').filter({ visible: true }).waitFor();
    await page.getByText('Freela').filter({ visible: true }).waitFor();
    await total('Receitas a receber', '900,00').waitFor();
    await total('Despesas a pagar', '120,00').waitFor();
    if (await page.getByText('Pago hoje').filter({ visible: true }).count())
      throw new Error('paid item listed');
    if (await page.getByText('Seguro').filter({ visible: true }).count())
      throw new Error('item beyond the period listed');
  });
  await radio(page, 'Período', '90 dias').click();
  await step('a longer period includes later commitments', async () => {
    await page.getByText('Seguro').filter({ visible: true }).waitFor();
    await total('Despesas a pagar', '620,00').waitFor();
  });
  await page.getByRole('button', { name: 'Marcar como pago: Internet' }).click();
  await step('paying an item removes it from the commitments', async () => {
    await page.getByText('Internet').filter({ visible: true }).waitFor({ state: 'hidden' });
    await total('Despesas a pagar', '500,00').waitFor();
  });
}
