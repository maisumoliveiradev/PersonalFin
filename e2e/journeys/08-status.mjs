import { addTransaction, newPage, row, signUpWithSpace } from '../helpers.mjs';

export default async function statusJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Status Teste');
  await addTransaction(page, {
    description: 'Conta de luz',
    amount: '180,00',
    date: '10/02/2026',
    category: 'Moradia',
    pending: true,
  });
  await addTransaction(page, {
    income: true,
    description: 'Freela',
    amount: '900,00',
    date: '09/02/2026',
    category: 'Receitas',
    pending: true,
  });
  const button = (target, name) => target.getByRole('button', { name });
  await button(page, 'Marcar como pago: Conta de luz').click();
  await step('expense can be marked as paid', () =>
    button(page, 'Marcar como pendente: Conta de luz').waitFor(),
  );
  await button(page, 'Marcar como recebido: Freela').click();
  await step('income can be marked as received', () =>
    button(page, 'Marcar como pendente: Freela').waitFor(),
  );
  await button(page, 'Marcar como pendente: Conta de luz').click();
  await step('status can go back to pending', () =>
    button(page, 'Marcar como pago: Conta de luz').waitFor(),
  );
  const other = await page.context().newPage();
  await other.goto(`${spaceUrl}?month=2026-02`, { waitUntil: 'networkidle' });
  await button(other, 'Marcar como pago: Conta de luz').click();
  await button(other, 'Marcar como pendente: Conta de luz').waitFor();
  await button(page, 'Marcar como pago: Conta de luz').click();
  await step('a stale toggle shows an error and refreshes', async () => {
    await page.getByText('Não foi possível alterar a situação.', { exact: false }).waitFor();
    await button(page, 'Marcar como pendente: Conta de luz').waitFor();
  });
  await row(page, 'Despesa', 'Conta de luz').click();
  await step('the row still opens the edit screen', () =>
    page.getByRole('heading', { name: 'Editar lançamento' }).waitFor(),
  );
}
