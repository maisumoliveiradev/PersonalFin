import { field, radio, row, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });

async function foreignExpense(page, { description, currency, amount, rate = '' }) {
  await visible(page.getByRole('button', { name: 'Novo lançamento' })).click();
  await field(page, 'Descrição').fill(description);
  await radio(page, 'Moeda', currency).click();
  await page
    .getByLabel(/^Valor \([A-Z]{3}\)$/)
    .filter({ visible: true })
    .fill(amount);
  if (rate !== '') {
    await page
      .getByLabel(/^Cotação \(R\$ por 1/)
      .filter({ visible: true })
      .fill(rate);
  }
  await field(page, 'Data').fill('05/10/2026');
  await radio(page, 'Categoria', 'Alimentação').click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
}

export default async function multiCurrencyJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const spaceUrl = await signUpWithSpace(page, 'Moedas Teste');

  await visible(page.getByRole('button', { name: 'Cotações' })).click();
  await radio(page, 'Moeda', 'Dólar (US$)').click();
  await field(page, 'Cotação (R$ por 1 unidade)').fill('5,40');
  await field(page, 'Válida a partir de').fill('01/10/2026');
  await page.getByRole('button', { name: 'Registrar cotação' }).click();
  await step('a manual exchange rate is recorded', async () => {
    await page.getByText('Cotação registrada.').waitFor();
    await visible(page.getByText('USD: 5,4 em 01/10/2026')).waitFor();
  });

  await page.goto(spaceUrl, { waitUntil: 'networkidle' });
  await foreignExpense(page, {
    description: 'Jantar em NY',
    currency: 'Dólar (US$)',
    amount: '10,00',
  });
  await step(
    'a dollar expense is converted with the recorded rate and keeps the original',
    async () => {
      await page.getByText('Lançamento salvo.').waitFor();
      await visible(row(page, 'Despesa', 'Jantar em NY'))
        .and(page.getByLabel(/R\$\s54,00/))
        .waitFor();
      await visible(page.getByText(/US\$\s10,00 · cotação 5,4/)).waitFor();
    },
  );

  await visible(row(page, 'Despesa', 'Jantar em NY')).click();
  await page.getByLabel('Valor (USD)').filter({ visible: true }).fill('20,00');
  await step('the form shows the conversion before saving', async () => {
    await visible(page.getByText('Equivale a R$ 108,00.')).waitFor();
  });
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await step('editing the original amount converts again with the preserved rate', async () => {
    await page.getByText('Lançamento atualizado.').waitFor();
    await visible(row(page, 'Despesa', 'Jantar em NY'))
      .and(page.getByLabel(/R\$\s108,00/))
      .waitFor();
  });

  await foreignExpense(page, { description: 'Croissant', currency: 'Euro (€)', amount: '5,00' });
  await step('a currency without a known rate asks for one', async () => {
    await visible(
      page.getByText('Não há cotação registrada até esta data. Informe a cotação.'),
    ).waitFor();
  });
}
