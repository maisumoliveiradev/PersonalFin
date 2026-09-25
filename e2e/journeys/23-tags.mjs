import { addTransaction, field, newPage, row, signUpWithSpace } from '../helpers.mjs';

export default async function tagsJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Tags Teste');
  const checkbox = (name) =>
    page
      .getByRole('group', { name: 'Tags' })
      .filter({ visible: true })
      .getByRole('checkbox', { name, exact: true });

  await page.getByRole('button', { name: 'Tags', exact: true }).click();
  await step('a space starts without tags', () => page.getByText('Nenhuma tag criada.').waitFor());
  for (const name of ['Viagem', 'Trabalho', 'Nunca usada']) {
    await field(page, 'Nome da tag').fill(name);
    await page.getByRole('button', { name: 'Criar tag' }).click();
    await page.getByRole('button', { name }).filter({ visible: true }).waitFor();
  }
  await field(page, 'Nome da tag').fill('viagem');
  await page.getByRole('button', { name: 'Criar tag' }).click();
  await step('a repeated tag name is rejected', () =>
    page.getByText('Já existe uma tag com esse nome.').waitFor(),
  );
  await page.goto(spaceUrl, { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await field(page, 'Descrição').fill('Hotel');
  await field(page, 'Valor (R$)').fill('500,00');
  await field(page, 'Data').fill('05/10/2026');
  await page
    .getByRole('radiogroup', { name: 'Categoria' })
    .getByRole('radio', { name: 'Lazer', exact: true })
    .click();
  await checkbox('Viagem').click();
  await checkbox('Trabalho').click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento salvo.').waitFor();
  await addTransaction(page, {
    description: 'Mercado',
    amount: '100,00',
    date: '06/10/2026',
    category: 'Alimentação',
  });
  const hotel = () => row(page, 'Despesa', 'Hotel').filter({ visible: true });
  await step('tags appear on the transaction', () =>
    hotel().getByText('#Trabalho #Viagem', { exact: false }).waitFor(),
  );

  await page.getByRole('button', { name: 'Filtros' }).click();
  await page
    .getByRole('radiogroup', { name: 'Tag' })
    .getByRole('radio', { name: 'Viagem', exact: true })
    .click();
  await step('the list filters by tag', async () => {
    await hotel().waitFor();
    await row(page, 'Despesa', 'Mercado').filter({ visible: true }).waitFor({ state: 'detached' });
  });
  await page.goto(`${spaceUrl}?month=2026-10`, { waitUntil: 'networkidle' });

  await hotel().click();
  await checkbox('Trabalho').click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await page.getByText('Lançamento atualizado.').waitFor();
  await step('editing replaces the tags', async () => {
    await hotel().getByText('#Viagem', { exact: false }).waitFor();
    if (await hotel().getByText('#Trabalho', { exact: false }).count()) {
      throw new Error('removed tag still shown');
    }
  });

  await page.getByRole('button', { name: 'Tags', exact: true }).click();
  await page.getByRole('button', { name: 'Viagem' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Excluir tag' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await step('a used tag cannot be deleted', () =>
    page.getByText('A tag já foi usada; arquive-a em vez de excluir.').waitFor(),
  );
  await page.getByRole('button', { name: 'Arquivar tag' }).click();
  await page.getByRole('button', { name: 'Reativar tag' }).waitFor();
  await page.getByRole('button', { name: 'Voltar às tags' }).click();
  await page.getByRole('button', { name: 'Nunca usada' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Excluir tag' }).click();
  await page.getByRole('button', { name: 'Confirmar exclusão' }).click();
  await step('a never-used tag is deleted', () =>
    page.getByRole('button', { name: 'Trabalho' }).filter({ visible: true }).waitFor(),
  );

  await page.goto(`${spaceUrl}?month=2026-10`, { waitUntil: 'networkidle' });
  await step('the archived tag stays on its transaction', () =>
    hotel().getByText('#Viagem', { exact: false }).waitFor(),
  );
  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await step('an archived tag is not offered for new transactions', async () => {
    await checkbox('Trabalho').waitFor();
    if (await checkbox('Viagem').count()) {
      throw new Error('archived tag offered');
    }
  });
}
