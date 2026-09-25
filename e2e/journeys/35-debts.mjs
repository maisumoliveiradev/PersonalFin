import { field, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });
const text = (page, value) => visible(page.getByText(value, { exact: true }));

export default async function debtsJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Dividas Teste');
  await visible(page.getByRole('button', { name: 'Dívidas' })).click();

  await step('an empty space explains debts do not create transactions', async () => {
    await page.getByText('Nenhuma dívida cadastrada.').waitFor();
    await page.getByText('não cria um lançamento', { exact: false }).waitFor();
  });

  await page.getByRole('button', { name: 'Nova dívida' }).click();
  await field(page, 'Nome').fill('Financiamento do carro');
  await field(page, 'Valor original (R$)').fill('12.000,50');
  await field(page, 'Número de parcelas').fill('12');
  await field(page, 'Vencimento da primeira parcela').fill('31/01/2027');
  await page.getByRole('button', { name: 'Cadastrar dívida' }).click();

  await step(
    'a new debt shows its plan with the last installment absorbing the cents',
    async () => {
      await page.getByRole('heading', { name: 'Financiamento do carro' }).waitFor();
      await text(page, 'Saldo devedor: R$ 12.000,50').waitFor();
      await text(page, 'Parcela: R$ 1.000,04').waitFor();
      await text(page, 'Última parcela: R$ 1.000,06').waitFor();
      await text(page, 'Próximo vencimento: 31/01/2027').waitFor();
    },
  );

  await page.getByRole('button', { name: 'Registrar pagamento' }).last().click();
  await step('paying an installment updates progress and the next due date', async () => {
    await text(page, 'Pagamento registrado.').waitFor();
    await text(page, 'Saldo devedor: R$ 11.000,46').waitFor();
    await text(page, 'Parcelas pagas: 1 · restantes: 11').waitFor();
    await text(page, 'Próximo vencimento: 28/02/2027').waitFor();
    await page.getByRole('progressbar', { name: /8,3% pago$/ }).waitFor();
  });

  await field(page, 'Valor pago (R$)').fill('20.000,00');
  await page.getByRole('button', { name: 'Registrar pagamento' }).last().click();
  await step('a payment above the outstanding balance is refused', async () => {
    await text(page, 'O pagamento é maior que o saldo devedor.').waitFor();
  });

  await page.getByRole('button', { name: /^Remover pagamento: Parcela: R\$\s1\.000,04/ }).click();
  await step('removing a payment restores the balance', async () => {
    await text(page, 'Saldo devedor: R$ 12.000,50').waitFor();
    await text(page, 'Nenhum pagamento registrado.').waitFor();
  });

  await page.getByRole('button', { name: 'Voltar às dívidas' }).click();
  await step('the debt list shows the outstanding balance and progress', async () => {
    await visible(
      page.getByRole('button', { name: /^Financiamento do carro.*Saldo devedor: R\$\s12\.000,50/ }),
    ).waitFor();
  });
}
