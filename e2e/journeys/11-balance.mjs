import { field, newPage, signUpWithSpace } from '../helpers.mjs';

export default async function balanceJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Saldo Teste');
  await step('space starts without an observed balance', () =>
    page.getByText('Nenhum saldo informado ainda.').waitFor(),
  );
  await page.getByRole('button', { name: 'Atualizar saldo' }).click();
  await field(page, 'Saldo (R$)').fill('abc');
  await page.getByRole('button', { name: 'Salvar saldo' }).click();
  await step('invalid amount is rejected', () =>
    page.getByText('Valor inválido.', { exact: false }).waitFor(),
  );
  await field(page, 'Saldo (R$)').fill('2.500,00');
  await field(page, 'Data do saldo').fill('01/02/2026');
  await page.getByRole('button', { name: 'Salvar saldo' }).click();
  await step('recorded balance becomes the observed balance', async () => {
    await page.getByText('R$ 2.500,00', { exact: true }).first().waitFor();
    await page.getByText('Informado para 01/02/2026').waitFor();
  });
  await page.getByRole('button', { name: 'Atualizar saldo' }).click();
  await field(page, 'Saldo (R$)').fill('-150,75');
  await field(page, 'Data do saldo').fill('10/02/2026');
  await field(page, 'Observação (opcional)').fill('Cheque especial');
  await page.getByRole('button', { name: 'Salvar saldo' }).click();
  await step('negative balance is accepted as current', () =>
    page.getByText('-R$ 150,75', { exact: true }).first().waitFor(),
  );
  await step('a balance is not a transaction', async () => {
    if (await page.getByRole('button', { name: /^(Despesa|Receita): / }).count()) {
      throw new Error('snapshot listed as transaction');
    }
  });
  await page.getByRole('button', { name: 'Histórico de saldos' }).click();
  await step('history keeps every snapshot, newest first', async () => {
    const amounts = await page.getByText(/R\$ /).filter({ visible: true }).allTextContents();
    if (amounts.join('|') !== '-R$ 150,75|R$ 2.500,00') {
      throw new Error(amounts.join('|'));
    }
  });
}
