import { API, addTransaction, field, newPage, radio, row, signUpWithSpace } from '../helpers.mjs';

export default async function filtersJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Filtro Teste');
  const current = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());
  await step('list opens on the current month', () =>
    page
      .getByRole('heading', { name: current.charAt(0).toUpperCase() + current.slice(1) })
      .waitFor(),
  );
  await addTransaction(page, {
    description: 'Padaria São João',
    amount: '12,00',
    date: '03/02/2026',
    category: 'Alimentação',
  });
  await step('after saving, the list shows the saved month', () =>
    page.getByRole('heading', { name: 'Fevereiro de 2026' }).waitFor(),
  );
  await addTransaction(page, {
    description: 'Conta de luz',
    amount: '180,00',
    date: '10/02/2026',
    category: 'Moradia',
    pending: true,
  });
  await addTransaction(page, {
    income: true,
    description: 'Salário',
    amount: '5000',
    date: '05/02/2026',
    category: 'Receitas',
  });
  await addTransaction(page, {
    description: 'Janeiro antigo',
    amount: '10,00',
    date: '15/01/2026',
    category: 'Lazer',
  });
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await step('month navigation moves forward', async () => {
    await page.getByRole('heading', { name: 'Fevereiro de 2026' }).waitFor();
    if (await page.getByText('Janeiro antigo').count()) {
      throw new Error('January item in February');
    }
  });
  await page.getByRole('button', { name: 'Filtros' }).click();
  await radio(page, 'Tipo', 'Receitas').click();
  await step('type filter', async () => {
    await page.getByText('Salário').waitFor();
    if (await page.getByText('Conta de luz').count()) {
      throw new Error('expense shown');
    }
  });
  await radio(page, 'Tipo', 'Todos').click();
  await radio(page, 'Situação', 'Pendentes').click();
  await step('status filter', async () => {
    await page.getByText('Conta de luz').waitFor();
    if (await row(page, 'Receita', 'Salário').count()) {
      throw new Error('paid shown');
    }
  });
  await radio(page, 'Situação', 'Todas').click();
  await radio(page, 'Categoria', 'Alimentação').click();
  await step('category filter', async () => {
    await page.getByText('Padaria São João').waitFor();
    if (await page.getByText('Conta de luz').count()) {
      throw new Error('other category shown');
    }
  });
  await radio(page, 'Categoria', 'Todas').click();
  await field(page, 'Buscar na descrição').fill('sao joao');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await step('search ignores accents and case', async () => {
    await page.getByText('Padaria São João').waitFor();
    if (await row(page, 'Receita', 'Salário').count()) {
      throw new Error('non-matching shown');
    }
  });
  await field(page, 'Buscar na descrição').fill('inexistente');
  await page.getByRole('button', { name: 'Buscar', exact: true }).click();
  await step('filtered empty state is explicit', () =>
    page.getByText('Nenhum lançamento encontrado com estes filtros neste mês.').waitFor(),
  );
  await page.getByRole('button', { name: 'Limpar filtros' }).first().click();
  await step('clearing filters shows the month again', () =>
    row(page, 'Receita', 'Salário').waitFor(),
  );
  const spaceId = new URL(spaceUrl).pathname.split('/')[2];
  const created = await page.evaluate(
    async ({ api, spaceId }) => {
      const categories = await (
        await fetch(`${api}/financial-spaces/${spaceId}/categories`, { credentials: 'include' })
      ).json();
      const leisure = categories.items.find((item) => item.name === 'Lazer');
      let count = 0;
      for (let index = 0; index < 51; index += 1) {
        const response = await fetch(`${api}/financial-spaces/${spaceId}/transactions`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type: 'expense',
            description: `Lote ${index}`,
            amountMinor: 100,
            financialDate: '2026-02-20',
            categoryId: leisure.id,
          }),
        });
        if (response.ok) {
          count += 1;
        }
      }
      return count;
    },
    { api: API, spaceId },
  );
  if (created !== 51) {
    throw new Error(`created ${created}`);
  }
  await page.reload({ waitUntil: 'networkidle' });
  await step('a long month is paged with "Carregar mais"', async () => {
    await page.getByRole('button', { name: 'Carregar mais' }).click();
    await page.getByText('Padaria São João').waitFor();
    const rows = await page.getByRole('button', { name: /^(Despesa|Receita): / }).count();
    if (rows !== 54) {
      throw new Error(`rows ${rows}`);
    }
  });
}
