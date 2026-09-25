import { field, newPage, radio, row, signUpWithSpace } from '../helpers.mjs';

export default async function installmentsJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Parcelas Teste');

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

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await field(page, 'Descrição').fill('TV');
  await field(page, 'Valor (R$)').fill('1.000,00');
  await field(page, 'Data').fill('02/10/2026');
  await radio(page, 'Categoria', 'Moradia').click();
  await radio(page, 'Pagamento', 'Nubank').click();
  await field(page, 'Parcelas').fill('49');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await step('an invalid installment count is rejected', () =>
    page.getByText('Parcelas: use de 1 a 48', { exact: false }).waitFor(),
  );
  await field(page, 'Parcelas').fill('3');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento salvo.').waitFor();
  const tv = () => row(page, 'Despesa', 'TV').filter({ visible: true });
  await step('the first installment carries the remainder cents', async () => {
    await tv().getByText('parcela 1/3', { exact: false }).waitFor();
    await tv().getByText('−R$ 333,34').waitFor();
  });
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await step('the next installment is in the next month and invoice', async () => {
    await tv().getByText('parcela 2/3', { exact: false }).waitFor();
    await tv().getByText('−R$ 333,33').waitFor();
    await tv().getByText('Nubank · fatura de novembro de 2026').waitFor();
  });
  await tv().click();
  await page.getByRole('button', { name: 'Cancelar parcelas seguintes' }).click();
  await page.getByRole('button', { name: 'Confirmar cancelamento' }).click();
  await step('cancelling removes only later installments', () =>
    page.getByText('1 parcela cancelada.').waitFor(),
  );
  await page
    .getByRole('button', { name: 'Cancelar', exact: true })
    .filter({ visible: true })
    .click();
  await tv().waitFor();
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  await step('the cancelled installment leaves the list', async () => {
    await page.getByText('Nenhum lançamento', { exact: false }).first().waitFor();
    if (await tv().count()) {
      throw new Error('cancelled installment still listed');
    }
  });
}
