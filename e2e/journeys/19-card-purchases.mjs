import { field, newPage, radio, row, signUpWithSpace } from '../helpers.mjs';

export default async function cardPurchasesJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Compras Cartao');
  const region = () => page.getByRole('region', { name: 'Resumo do mês' });
  const metric = (label, value) => region().getByLabel(`${label}: ${value}`, { exact: true });
  const isChecked = async (group, name) =>
    (await radio(page, group, name).getAttribute('aria-checked')) === 'true';

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
  await step('the suggested invoice follows the closing day', async () => {
    if (!(await isChecked('Fatura', 'Outubro de 2026'))) {
      throw new Error('October invoice not suggested for 02/10');
    }
    await field(page, 'Data').fill('03/10/2026');
    if (!(await isChecked('Fatura', 'Novembro de 2026'))) {
      throw new Error('November invoice not suggested for 03/10');
    }
    await field(page, 'Data').fill('02/10/2026');
  });
  await step('card purchases have no status or repetition', async () => {
    const groups = await page
      .getByRole('radiogroup', { name: /^(Situação|Repetir)$/ })
      .filter({ visible: true })
      .count();
    if (groups !== 0) {
      throw new Error(`${groups} status/repeat groups visible`);
    }
  });
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento salvo.').waitFor();
  const mercado = row(page, 'Despesa', 'Mercado').filter({ visible: true });
  await step('the purchase shows its card and invoice instead of a status toggle', async () => {
    await mercado.getByText('Nubank · fatura de outubro de 2026').waitFor();
    const toggles = await page
      .getByRole('button', { name: /Mercado$/ })
      .filter({ visible: true, hasText: /Marcar/ })
      .count();
    if (toggles !== 0) {
      throw new Error('status toggle shown for a card purchase');
    }
  });
  await step('the invoice counts in the forecast and the projection', async () => {
    await metric('Despesas previstas', 'R$ 100,00').waitFor();
    await metric('Faturas de cartão em aberto', '-R$ 100,00').waitFor();
    await metric('Saldo projetado no fim do mês', 'R$ 900,00').waitFor();
  });

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await field(page, 'Descrição').fill('Farmácia');
  await field(page, 'Valor (R$)').fill('50,00');
  await field(page, 'Data').fill('03/10/2026');
  await radio(page, 'Categoria', 'Saúde').click();
  await radio(page, 'Pagamento', 'Nubank').click();
  await radio(page, 'Fatura', 'Dezembro de 2026').click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento salvo.').waitFor();
  await step('another invoice can be chosen manually', () =>
    row(page, 'Despesa', 'Farmácia')
      .filter({ visible: true })
      .getByText('Nubank · fatura de dezembro de 2026')
      .waitFor(),
  );

  await mercado.click();
  await step('editing keeps the purchase on its card', async () => {
    await page.getByText('Compra no cartão Nubank').waitFor();
    if (await page.getByRole('radiogroup', { name: 'Tipo' }).filter({ visible: true }).count()) {
      throw new Error('type can be changed on a card purchase');
    }
  });
  await radio(page, 'Fatura', 'Novembro de 2026').click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento atualizado.').waitFor();
  await step('the purchase moves to the chosen invoice', async () => {
    await mercado.getByText('Nubank · fatura de novembro de 2026').waitFor();
    await metric('Despesas previstas', 'R$ 0,00').waitFor();
  });

  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page
    .getByRole('button', { name: /^Nubank/ })
    .filter({ visible: true })
    .click();
  await page.getByRole('button', { name: 'Ver faturas' }).click();
  await page.getByText('Datas desta fatura').waitFor();
  await page.goto(`${page.url()}&month=2026-11`, { waitUntil: 'networkidle' });
  await step('the invoice lists its purchases with dates and total', async () => {
    await page.getByText('Fecha em 03/11/2026 · vence em 10/11/2026').waitFor();
    await page.getByText('Total da fatura: R$ 100,00').waitFor();
    await row(page, 'Despesa', 'Mercado').filter({ visible: true }).waitFor();
  });
  await field(page, 'Data de fechamento').fill('01/11/2026');
  await field(page, 'Data de vencimento').fill('09/11/2026');
  await page.getByRole('button', { name: 'Salvar datas' }).click();
  await step('one invoice can have its own dates', async () => {
    await page.getByText('Fecha em 01/11/2026 · vence em 09/11/2026').waitFor();
    await page.getByText('Total da fatura: R$ 100,00').waitFor();
  });
}
