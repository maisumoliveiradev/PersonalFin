import { field, localDate, newPage, radio, signUpWithSpace } from '../helpers.mjs';

export default async function transactionEntryJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Lanca Teste');
  const save = () => page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await step('form opens with today as default date', async () => {
    const value = await field(page, 'Data').inputValue();
    if (value !== localDate()) {
      throw new Error(`default date ${value}`);
    }
  });
  await step('income categories are hidden for expenses', async () => {
    if (await radio(page, 'Categoria', 'Receitas').count()) {
      throw new Error('income category offered');
    }
  });
  await save();
  await step('empty description is rejected', () =>
    page.getByText('Informe uma descrição.').waitFor(),
  );
  await field(page, 'Descrição').fill('Mercado do mês');
  await field(page, 'Valor (R$)').fill('0');
  await save();
  await step('zero amount is rejected', () =>
    page.getByText('O valor precisa ser maior que zero.').waitFor(),
  );
  await field(page, 'Valor (R$)').fill('12,345');
  await save();
  await step('three decimals are rejected', () =>
    page.getByText('Use no máximo 2 casas decimais.').waitFor(),
  );
  await field(page, 'Valor (R$)').fill('1.234,56');
  await field(page, 'Data').fill('31/02/2026');
  await save();
  await step('impossible date is rejected', () =>
    page.getByText('Data inválida. Use DD/MM/AAAA.').waitFor(),
  );
  await field(page, 'Data').fill('05/01/2026');
  await save();
  await step('missing category is rejected', () =>
    page.getByText('Escolha uma categoria.').waitFor(),
  );
  await radio(page, 'Categoria', 'Alimentação').click();
  await radio(page, 'Subcategoria (opcional)', 'Supermercado').click();
  await save();
  await step('expense is saved', () => page.getByText('Lançamento salvo.').waitFor());
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await radio(page, 'Tipo', 'Receita').click();
  await step('status label adapts to income', () => radio(page, 'Situação', 'Recebido').waitFor());
  await field(page, 'Descrição').fill('Salário');
  await field(page, 'Valor (R$)').fill('5000');
  await field(page, 'Data').fill('01/03/2026');
  await radio(page, 'Categoria', 'Receitas').click();
  await radio(page, 'Situação', 'Pendente').click();
  await save();
  await step('pending income is saved', () => page.getByText('Lançamento salvo.').waitFor());
}
