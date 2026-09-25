import { field, localDate, newPage, signUpWithSpace } from '../helpers.mjs';

export default async function cardsJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Cards Teste');
  await page.getByRole('button', { name: 'Cartões', exact: true }).click();
  await step('a space starts without cards', () =>
    page.getByText('Nenhum cartão cadastrado.').waitFor(),
  );
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
  await step('a blank name is rejected', () =>
    page.getByText('Informe o nome do cartão.').waitFor(),
  );
  await field(page, 'Nome do cartão').fill('Nubank');
  await field(page, 'Dia de fechamento').fill('32');
  await field(page, 'Dia de vencimento').fill('10');
  await field(page, 'Limite (R$)').fill('5.000,00');
  await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
  await step('an invalid day is rejected', () =>
    page.getByText('Os dias de fechamento e vencimento devem ser de 1 a 31.').waitFor(),
  );
  await field(page, 'Dia de fechamento').fill('3');
  await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
  const card = page.getByRole('button', { name: /^Nubank/ }).filter({ visible: true });
  await step('the card is listed with its days and current limit', async () => {
    await card.getByText('Fecha dia 3 · vence dia 10 — Limite atual: R$ 5.000,00').waitFor();
  });
  await page.getByRole('button', { name: 'Novo cartão' }).click();
  await field(page, 'Nome do cartão').fill('NUBANK');
  await field(page, 'Dia de fechamento').fill('1');
  await field(page, 'Dia de vencimento').fill('8');
  await field(page, 'Limite (R$)').fill('100,00');
  await page.getByRole('button', { name: 'Cadastrar cartão' }).click();
  await step('a repeated name is rejected', () =>
    page.getByText('Já existe um cartão com esse nome.').waitFor(),
  );
  await page.getByRole('button', { name: 'Cancelar' }).filter({ visible: true }).click();
  await card.click();
  await field(page, 'Limite (R$)').fill('8.000,00');
  await field(page, 'Limite válido a partir de').fill(localDate(30));
  await page.getByRole('button', { name: 'Registrar limite' }).click();
  await step('a future limit does not change the current limit', async () => {
    await page.getByText(`R$ 8.000,00 a partir de ${localDate(30)}`).waitFor();
    await page.getByText('Limite atual: R$ 5.000,00').filter({ visible: true }).waitFor();
  });
  await field(page, 'Limite (R$)').fill('6.000,00');
  await field(page, 'Limite válido a partir de').fill(localDate(0));
  await page.getByRole('button', { name: 'Registrar limite' }).click();
  await step('a limit effective today becomes current and history keeps every value', async () => {
    await page.getByText('Limite atual: R$ 6.000,00').filter({ visible: true }).waitFor();
    const history = await page
      .getByText(/ a partir de /)
      .filter({ visible: true })
      .allTextContents();
    if (history.length !== 3 || !history[2]?.startsWith('R$ 5.000,00')) {
      throw new Error(history.join(' | '));
    }
  });
  await field(page, 'Dia de vencimento').fill('15');
  await page.getByRole('button', { name: 'Salvar cartão' }).click();
  await step('closing and due days can be changed', () =>
    page.getByText('Cartão salvo.').waitFor(),
  );
  await page.getByRole('button', { name: 'Arquivar cartão' }).click();
  await page.getByRole('button', { name: 'Reativar cartão' }).waitFor();
  await page.getByRole('button', { name: 'Voltar aos cartões' }).click();
  await step('an archived card stays listed as archived', () =>
    card.getByText(/^Arquivado — Fecha dia 3 · vence dia 15/).waitFor(),
  );
}
