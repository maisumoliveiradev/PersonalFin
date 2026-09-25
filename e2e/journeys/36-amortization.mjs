import { field, radio, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });
const text = (page, value) => visible(page.getByText(value, { exact: true }));

export default async function amortizationJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Amortizacao Teste');
  await visible(page.getByRole('button', { name: 'Dívidas' })).click();
  await page.getByRole('button', { name: 'Nova dívida' }).click();
  await field(page, 'Nome').fill('Empréstimo');
  await field(page, 'Valor original (R$)').fill('12.000,00');
  await field(page, 'Número de parcelas').fill('12');
  await field(page, 'Vencimento da primeira parcela').fill('10/01/2027');
  await page.getByRole('button', { name: 'Cadastrar dívida' }).click();
  await text(page, 'Saldo devedor: R$ 12.000,00').waitFor();

  await field(page, 'Valor da amortização (R$)').fill('2.500,00');
  await page.getByRole('button', { name: 'Simular' }).click();
  await step('reducing the term keeps the installment and shortens the plan', async () => {
    await text(
      page,
      'Com a amortização: 10 parcela(s) de R$ 1.000,00; saldo R$ 9.500,00',
    ).waitFor();
    await text(page, 'Última parcela: R$ 500,00').waitFor();
  });

  await radio(page, 'O que reduzir', 'Reduzir a parcela').click();
  await page.getByRole('button', { name: 'Simular' }).click();
  await step('reducing the installment keeps the count and lowers the installment', async () => {
    await text(page, 'Com a amortização: 12 parcela(s) de R$ 791,66; saldo R$ 9.500,00').waitFor();
    await text(page, 'Última parcela: R$ 791,74').waitFor();
  });

  await step('simulating changes nothing', async () => {
    await text(page, 'Saldo devedor: R$ 12.000,00').waitFor();
    await text(page, 'Nenhum pagamento registrado.').waitFor();
  });

  await page.getByRole('button', { name: 'Confirmar amortização' }).click();
  await field(page, 'Data da amortização').fill('05/12/2026');
  await page.getByRole('button', { name: 'Sim, registrar amortização' }).click();
  await step('confirming records the prepayment and applies the simulated plan', async () => {
    await text(page, 'Amortização registrada e plano atualizado.').waitFor();
    await text(page, 'Saldo devedor: R$ 9.500,00').waitFor();
    await text(page, 'Parcela: R$ 791,66').waitFor();
    await text(page, 'Amortização: R$ 2.500,00 em 05/12/2026').waitFor();
  });
}
