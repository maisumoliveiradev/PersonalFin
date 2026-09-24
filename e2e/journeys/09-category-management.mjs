import { addTransaction, field, newPage, radio, row, signUpWithSpace } from '../helpers.mjs';

export default async function categoryManagementJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Gestao Teste');
  const click = (name) => page.getByRole('button', { name }).filter({ visible: true }).click();
  await addTransaction(page, {
    description: 'Cinema',
    amount: '40,00',
    date: '03/02/2026',
    category: 'Lazer',
  });
  await click('Gerenciar categorias');
  await click('Nova categoria');
  await field(page, 'Nome').fill('Pets');
  await click('Criar');
  await step('new category appears', () => page.getByRole('button', { name: /^Pets/ }).waitFor());
  await click('Nova categoria');
  await field(page, 'Nome').fill('Moradia');
  await click('Criar');
  await step('duplicate name is rejected', () =>
    page.getByText('Já existe uma categoria com esse nome neste nível.').waitFor(),
  );
  await click('Cancelar');
  await click(/^Pets/);
  await click('Nova subcategoria');
  await field(page, 'Nome').fill('Veterinário');
  await click('Criar');
  await step('subcategory is created under its parent', () =>
    page.getByRole('button', { name: /^Veterinário/ }).waitFor(),
  );
  await click('Voltar às categorias');
  await click(/^Lazer/);
  await field(page, 'Nome').fill('Diversão');
  await click('Salvar nome');
  await step('rename is saved', () => page.getByText('Categoria salva.').waitFor());
  await click('Excluir definitivamente');
  await click('Sim, excluir');
  await step('used category cannot be deleted', () =>
    page.getByText('Esta categoria já foi usada em lançamentos.', { exact: false }).waitFor(),
  );
  await click('Arquivar');
  await step('category can be archived', () =>
    page.getByRole('button', { name: 'Desarquivar' }).waitFor(),
  );
  await page.goto(`${spaceUrl}?month=2026-02`, { waitUntil: 'networkidle' });
  await step('existing transaction shows the new name', () =>
    page.getByText('03/02/2026 · Diversão').waitFor(),
  );
  await click('Novo lançamento');
  await step('archived category is not offered for new transactions', async () => {
    await radio(page, 'Categoria', 'Pets').waitFor();
    if (await radio(page, 'Categoria', 'Diversão').count()) {
      throw new Error('archived category offered');
    }
  });
  await click('Cancelar');
  await row(page, 'Despesa', 'Cinema').click();
  await step('archived category stays selected on its transaction', async () => {
    const checked = await radio(page, 'Categoria', 'Diversão').getAttribute('aria-checked');
    if (checked !== 'true') {
      throw new Error('archived category not kept');
    }
  });
  await field(page, 'Valor (R$)').fill('45,00');
  await click('Salvar lançamento');
  await step('that transaction can still be edited', () =>
    page.getByText('Lançamento atualizado.').waitFor(),
  );
  await click('Gerenciar categorias');
  await click(/^Pets/);
  await click(/^Veterinário/);
  await click('Excluir definitivamente');
  await click('Sim, excluir');
  await step('unused subcategory is deleted', () =>
    page.getByRole('heading', { name: 'Categorias' }).waitFor(),
  );
  await click(/^Pets/);
  await step('parent no longer lists it', () => page.getByText('Nenhuma subcategoria.').waitFor());
}
