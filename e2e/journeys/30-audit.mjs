import { addTransaction, field, newPage, row, signUpWithSpace } from '../helpers.mjs';

export default async function auditJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Auditoria Teste');
  await addTransaction(page, {
    description: 'Mercado',
    amount: '100,00',
    date: '05/10/2026',
    category: 'Alimentação',
  });
  await row(page, 'Despesa', 'Mercado').filter({ visible: true }).click();
  await field(page, 'Descrição').fill('Supermercado');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento atualizado.').waitFor();
  await page.goto(`${spaceUrl}/tags`, { waitUntil: 'networkidle' });
  await field(page, 'Nome da tag').fill('Viagem');
  await page.getByRole('button', { name: 'Criar tag' }).click();
  await page.getByRole('button', { name: 'Viagem' }).filter({ visible: true }).waitFor();

  await page.goto(spaceUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Histórico de alterações' }).click();
  await step('the history lists changes newest first with who made them', async () => {
    const labels = await page
      .getByLabel(/ · Auditoria Teste · /)
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
    if (!labels[0]?.includes('Tag: criação. name: — → Viagem')) {
      throw new Error(labels.join(' | '));
    }
    if (!labels[1]?.includes('Lançamento: alteração. description: Mercado → Supermercado')) {
      throw new Error(labels.join(' | '));
    }
  });
}
