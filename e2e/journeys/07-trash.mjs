import { addTransaction, newPage, row, signUpWithSpace } from '../helpers.mjs';

export default async function trashJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Lixeira Teste');
  await addTransaction(page, {
    description: 'Compra errada',
    amount: '45,00',
    date: '02/02/2026',
    category: 'Lazer',
  });
  await addTransaction(page, {
    description: 'Compra certa',
    amount: '12,00',
    date: '01/02/2026',
    category: 'Lazer',
  });
  await row(page, 'Despesa', 'Compra errada').click();
  await page.getByRole('button', { name: 'Excluir lançamento' }).click();
  await step('deletion asks for confirmation', () =>
    page.getByText('Excluir este lançamento?', { exact: false }).waitFor(),
  );
  await page.getByRole('button', { name: 'Não excluir' }).click();
  await page.getByRole('button', { name: 'Excluir lançamento' }).click();
  await page.getByRole('button', { name: 'Sim, excluir' }).click();
  await step('deleted transaction leaves the list', async () => {
    await page.getByText('Lançamento excluído.', { exact: false }).waitFor();
    await page.getByText('Compra certa').waitFor();
    if (await page.getByText('Compra errada', { exact: true }).count()) {
      throw new Error('still listed');
    }
  });
  await page.getByRole('button', { name: 'Lixeira' }).click();
  await step('trash lists it', () => page.getByText('Compra errada').waitFor());
  await page.getByRole('button', { name: 'Restaurar Compra errada' }).click();
  await step('restore empties the trash', async () => {
    await page.getByText('Lançamento restaurado.').waitFor();
    await page.getByText('A Lixeira está vazia.').waitFor();
  });
  await page.getByRole('button', { name: 'Voltar ao espaço' }).click();
  await step('restored transaction is back with the same values', async () => {
    await page.getByText('02/02/2026 · Lazer').waitFor();
    await page.getByText('−R$ 45,00').waitFor();
  });
}
