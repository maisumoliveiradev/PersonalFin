import { addTransaction, field, newPage, radio, signUpWithSpace } from '../helpers.mjs';

export default async function breakdownJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Quebra Teste');

  await page.getByRole('button', { name: 'Tags', exact: true }).click();
  await field(page, 'Nome da tag').fill('Viagem');
  await page.getByRole('button', { name: 'Criar tag' }).click();
  await page.getByRole('button', { name: 'Viagem' }).filter({ visible: true }).waitFor();
  await page.goto(spaceUrl, { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await field(page, 'Descrição').fill('Hotel');
  await field(page, 'Valor (R$)').fill('300,00');
  await field(page, 'Data').fill('05/10/2026');
  await radio(page, 'Categoria', 'Moradia').click();
  await page
    .getByRole('group', { name: 'Tags' })
    .filter({ visible: true })
    .getByRole('checkbox', { name: 'Viagem', exact: true })
    .click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento salvo.').waitFor();
  await addTransaction(page, {
    description: 'Mercado',
    amount: '100,00',
    date: '06/10/2026',
    category: 'Alimentação',
  });
  await addTransaction(page, {
    description: 'Luz',
    amount: '50,00',
    date: '10/09/2026',
    category: 'Moradia',
  });

  await page.goto(`${spaceUrl}/analytics?month=2026-10`, { waitUntil: 'networkidle' });
  const region = page.getByRole('region', { name: 'Para onde foi o dinheiro' });
  const item = (label) => region.getByLabel(label, { exact: true });
  await step('expenses are split by category with shares and the previous period', async () => {
    await item('Moradia: R$ 300,00 · 75,0% · anterior R$ 50,00').waitFor();
    await item('Alimentação: R$ 100,00 · 25,0% · anterior R$ 0,00').waitFor();
  });
  await step('tags count the whole transaction', () =>
    item('Viagem: R$ 300,00 · 75,0% · anterior R$ 0,00').waitFor(),
  );
  await region.getByRole('radio', { name: '3 meses', exact: true }).click();
  await step('a longer period includes earlier months', () =>
    item('Moradia: R$ 350,00 · 77,8% · anterior R$ 0,00').waitFor(),
  );
}
