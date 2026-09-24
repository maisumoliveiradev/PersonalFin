import { addTransaction, field, newPage, radio, row, signUpWithSpace } from '../helpers.mjs';

export default async function editJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Edita Teste');
  await addTransaction(page, {
    description: 'Mercado',
    amount: '1.234,56',
    date: '05/01/2026',
    category: 'Alimentação',
  });
  await row(page, 'Despesa', 'Mercado').click();
  await step('edit form is prefilled', async () => {
    await page.getByRole('heading', { name: 'Editar lançamento' }).waitFor();
    const amount = await field(page, 'Valor (R$)').inputValue();
    const date = await field(page, 'Data').inputValue();
    const checked = await radio(page, 'Categoria', 'Alimentação').getAttribute('aria-checked');
    if (amount !== '1.234,56' || date !== '05/01/2026' || checked !== 'true') {
      throw new Error(`${amount} ${date} ${checked}`);
    }
  });
  const editUrl = page.url();
  await radio(page, 'Tipo', 'Receita').click();
  await field(page, 'Descrição').fill('Reembolso');
  await field(page, 'Valor (R$)').fill('99,90');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await step('changing type requires a new category', () =>
    page.getByText('Escolha uma categoria.').waitFor(),
  );
  await radio(page, 'Categoria', 'Outras receitas').click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await step('edit is saved and listed', async () => {
    await page.getByText('Lançamento atualizado.').waitFor();
    await page.getByText('+R$ 99,90').waitFor();
  });
  const tabA = await page.context().newPage();
  const tabB = await page.context().newPage();
  for (const tab of [tabA, tabB]) {
    await tab.goto(editUrl, { waitUntil: 'networkidle' });
    await tab.getByRole('heading', { name: 'Editar lançamento' }).waitFor();
  }
  await field(tabA, 'Descrição').fill('Versão da aba A');
  await tabA.getByRole('button', { name: 'Salvar lançamento' }).click();
  await tabA.getByText('Lançamento atualizado.').waitFor();
  await field(tabB, 'Descrição').fill('Versão da aba B');
  await tabB.getByRole('button', { name: 'Salvar lançamento' }).click();
  await step('a stale edit shows a conflict instead of overwriting', () =>
    tabB.getByText('Este lançamento foi alterado em outro lugar.', { exact: false }).waitFor(),
  );
  await tabA.goto(`${spaceUrl}?month=2026-01`, { waitUntil: 'networkidle' });
  await step('the first edit is kept', () => tabA.getByText('Versão da aba A').waitFor());
}
