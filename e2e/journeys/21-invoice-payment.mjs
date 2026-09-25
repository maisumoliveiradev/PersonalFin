import { field, newPage, radio, row, signUpWithSpace } from '../helpers.mjs';

export default async function invoicePaymentJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Pagamento Fatura');
  const region = () => page.getByRole('region', { name: 'Resumo do mês' });
  const metric = (label, value) => region().getByLabel(`${label}: ${value}`, { exact: true });

  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  await field(page, 'Nome do cartão').fill('Nubank');
  await field(page, 'Dia de fechamento').fill('3');
  await field(page, 'Dia de vencimento').fill('10');
  await field(page, 'Limite (R$)').fill('5.000,00');
  await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
  await page
    .getByRole('button', { name: /^Nubank/ })
    .filter({ visible: true })
    .waitFor();
  await page.goto(spaceUrl, { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Atualizar saldo' }).first().click();
  await field(page, 'Saldo (R$)').fill('1.000,00');
  await field(page, 'Data do saldo').fill('30/09/2026');
  await page.getByRole('button', { name: 'Salvar saldo' }).click();
  await page.getByText('Informado para 30/09/2026').first().waitFor();

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await field(page, 'Descrição').fill('Mercado');
  await field(page, 'Valor (R$)').fill('100,00');
  await field(page, 'Data').fill('02/10/2026');
  await radio(page, 'Categoria', 'Alimentação').click();
  await radio(page, 'Pagamento', 'Nubank').click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento salvo.').waitFor();

  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page
    .getByRole('button', { name: /^Nubank/ })
    .filter({ visible: true })
    .click();
  await page.getByRole('button', { name: 'Ver faturas' }).click();
  await page.getByText('Datas desta fatura').waitFor();
  const invoiceUrl = `${page.url()}&month=2026-10`;
  await page.goto(invoiceUrl, { waitUntil: 'networkidle' });
  await step('an unpaid invoice shows its open amount', async () => {
    await page.getByText('Em aberto', { exact: true }).waitFor();
    await page.getByText('Pago: R$ 0,00 · Em aberto: R$ 100,00').waitFor();
  });
  await field(page, 'Valor pago (R$)').fill('150,00');
  await page.getByRole('button', { name: 'Registrar pagamento' }).click();
  await step('a payment above the open amount is rejected', () =>
    page.getByText('O valor é maior que o valor em aberto da fatura.').waitFor(),
  );
  await field(page, 'Valor pago (R$)').fill('40,00');
  await field(page, 'Data do pagamento').fill('10/10/2026');
  await page.getByRole('button', { name: 'Registrar pagamento' }).click();
  await step('a partial payment leaves the exact open amount', async () => {
    await page.getByText('Paga parcialmente').waitFor();
    await page.getByText('Pago: R$ 40,00 · Em aberto: R$ 60,00').waitFor();
  });
  await field(page, 'Data do pagamento').fill('13/10/2026');
  await page.getByRole('button', { name: 'Registrar pagamento' }).click();
  await step('paying the rest settles the invoice', async () => {
    await page.getByText('Paga', { exact: true }).waitFor();
    await page.getByText('Pago: R$ 100,00 · Em aberto: R$ 0,00').waitFor();
  });

  await page.goto(`${spaceUrl}?month=2026-10`, { waitUntil: 'networkidle' });
  await step(
    'purchases of a paid invoice are realized and the payment is not an expense',
    async () => {
      await row(page, 'Despesa', 'Mercado')
        .filter({ visible: true })
        .getByText('Nubank · fatura de outubro de 2026 (paga)')
        .waitFor();
      await metric('Despesas realizadas', 'R$ 100,00').waitFor();
      await metric('Despesas previstas', 'R$ 0,00').waitFor();
      const expenses = await page
        .getByRole('button', { name: /^Despesa: / })
        .filter({ visible: true })
        .count();
      if (expenses !== 1) {
        throw new Error(`${expenses} expenses listed`);
      }
    },
  );
  await step('the projection counts the invoice once', () =>
    metric('Saldo projetado no fim do mês', 'R$ 900,00').waitFor(),
  );

  await page.goto(invoiceUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Remover pagamento de R\$.60,00/ }).click();
  await step('removing a payment reopens the invoice', () =>
    page.getByText('Pago: R$ 40,00 · Em aberto: R$ 60,00').waitFor(),
  );
}
