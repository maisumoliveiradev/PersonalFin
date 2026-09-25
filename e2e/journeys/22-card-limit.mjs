import { field, localDate, newPage, radio, signUpWithSpace } from '../helpers.mjs';

export default async function cardLimitJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Limite Cartao');

  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  await field(page, 'Nome do cartão').fill('Nubank');
  await field(page, 'Dia de fechamento').fill('3');
  await field(page, 'Dia de vencimento').fill('10');
  await field(page, 'Limite (R$)').fill('5.000,00');
  await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
  const card = page.getByRole('button', { name: /^Nubank/ }).filter({ visible: true });
  await step('a new card has its whole limit available', () =>
    card.getByText(/Usado: R\$.0,00 · Disponível: R\$.5\.000,00 de R\$.5\.000,00/).waitFor(),
  );
  await page.goto(spaceUrl, { waitUntil: 'networkidle' });

  const buy = async (description, amount, installments) => {
    await page.getByRole('button', { name: 'Novo lançamento' }).click();
    await field(page, 'Descrição').fill(description);
    await field(page, 'Valor (R$)').fill(amount);
    await field(page, 'Data').fill(localDate(0));
    await radio(page, 'Categoria', 'Moradia').click();
    await radio(page, 'Pagamento', 'Nubank').click();
    await field(page, 'Parcelas').fill(installments);
    await page.getByRole('button', { name: 'Salvar lançamento' }).click();
    await page.getByText('Lançamento salvo.').waitFor();
  };
  await buy('Sofá', '1.200,00', '12');
  await buy('Mercado', '300,00', '1');

  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await step('future installments count as used limit', () =>
    card.getByText(/Usado: R\$.1\.500,00 · Disponível: R\$.3\.500,00 de R\$.5\.000,00/).waitFor(),
  );
  await card.click();
  const firstInvoice = page
    .getByRole('button', { name: /: R\$.400,00 · Em aberto/ })
    .filter({ visible: true });
  await step('the card lists its invoices month by month', async () => {
    await firstInvoice.waitFor();
    const later = await page
      .getByRole('button', { name: /: R\$.100,00 · Em aberto/ })
      .filter({ visible: true })
      .count();
    if (later < 2) {
      throw new Error(`${later} later installment invoices listed`);
    }
  });
  await firstInvoice.click();
  await page.getByRole('button', { name: 'Registrar pagamento' }).click();
  await page.getByText('Pagamento registrado.').waitFor();
  await page.getByRole('button', { name: 'Voltar aos cartões' }).click();
  await step('a payment frees the limit', () =>
    card.getByText(/Usado: R\$.1\.100,00 · Disponível: R\$.3\.900,00 de R\$.5\.000,00/).waitFor(),
  );
}
