import { addTransaction, field, newPage, signUpWithSpace } from '../helpers.mjs';

export default async function projectionJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Projecao Teste');
  const region = () => page.getByRole('region', { name: 'Resumo do mês' });
  const metric = (label, value) => region().getByLabel(`${label}: ${value}`, { exact: true });

  await page.getByRole('button', { name: 'Atualizar saldo' }).first().click();
  await field(page, 'Saldo (R$)').fill('1.000,00');
  await field(page, 'Data do saldo').fill('10/02/2026');
  await page.getByRole('button', { name: 'Salvar saldo' }).click();
  await page.getByText('Informado para 10/02/2026').first().waitFor();

  await addTransaction(page, {
    description: 'Pendente antiga',
    amount: '50,00',
    date: '08/02/2026',
    category: 'Moradia',
    pending: true,
  });
  await addTransaction(page, {
    income: true,
    description: 'Já no saldo',
    amount: '300,00',
    date: '10/02/2026',
    category: 'Receitas',
  });
  await addTransaction(page, {
    description: 'Depois paga',
    amount: '200,00',
    date: '15/02/2026',
    category: 'Moradia',
  });
  await addTransaction(page, {
    income: true,
    description: 'Freela',
    amount: '500,00',
    date: '25/02/2026',
    category: 'Receitas',
    pending: true,
  });

  await step('projection explains its base and components', async () => {
    await metric('Base: saldo observado em 10/02/2026', 'R$ 1.000,00').waitFor();
    await metric('Lançamentos após a observação', 'R$ 300,00').waitFor();
    await metric('Pendentes até a observação', '-R$ 50,00').waitFor();
  });
  await step('projected month-end balance follows M-008', () =>
    metric('Saldo projetado no fim do mês', 'R$ 1.250,00').waitFor(),
  );
  await step('the next months carry the projection', async () => {
    const series = page.getByRole('region', { name: 'Projeção dos próximos meses' });
    await series.getByLabel('fevereiro de 2026: R$ 1.250,00', { exact: true }).waitFor();
    await series.getByLabel('março de 2026: R$ 1.250,00', { exact: true }).waitFor();
  });
  await page.goto(`${spaceUrl}?month=2026-01`, { waitUntil: 'networkidle' });
  await step('no projection before any observed balance', () =>
    region().getByText('Informe um saldo observado para ver a projeção.').waitFor(),
  );
}
