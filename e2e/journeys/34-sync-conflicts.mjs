import {
  addTransaction,
  BASE,
  field,
  localDate,
  row,
  signUp,
  TIMEZONE,
  uniqueEmail,
} from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });

async function device(browser) {
  const context = await browser.newContext({ timezoneId: TIMEZONE });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return { context, page };
}

async function openSpace(page) {
  await visible(page.getByRole('button', { name: /^Conflitos/ })).click();
  await visible(page.getByRole('button', { name: 'Novo lançamento' })).waitFor();
}

async function editTransaction(page, description, label, value) {
  await visible(row(page, 'Despesa', description)).click();
  await field(page, label).fill(value);
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
}

async function deleteTransaction(page, description) {
  await visible(row(page, 'Despesa', description)).click();
  await page.getByRole('button', { name: 'Excluir lançamento' }).click();
  await page.getByRole('button', { name: 'Sim, excluir' }).click();
}

export default async function syncConflictsJourney({ browser, step }) {
  const email = uniqueEmail('conflitos');
  const a = await device(browser);
  await signUp(a.page, 'Conflitos Teste', email);
  await field(a.page, 'Nome do espaço').fill('Conflitos');
  await a.page.getByRole('button', { name: 'Criar espaço' }).click();
  await a.page.getByRole('button', { name: 'Novo lançamento' }).waitFor();
  for (const [description, amount] of [
    ['Aluguel', '1.000,00'],
    ['Internet', '100,00'],
    ['Academia', '90,00'],
    ['Streaming', '40,00'],
  ]) {
    await addTransaction(a.page, { description, amount, date: localDate(), category: 'Moradia' });
  }
  await visible(row(a.page, 'Despesa', 'Streaming')).waitFor();
  await a.page.waitForTimeout(1500);

  const b = await device(browser);
  await b.page.goto(`${BASE}/sign-in`, { waitUntil: 'networkidle' });
  await field(b.page, 'E-mail').fill(email);
  await field(b.page, 'Senha').fill('senha-segura-123');
  await b.page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await openSpace(b.page);

  await a.context.setOffline(true);
  await a.page.getByText('Sem conexão. Mostrando os dados salvos neste aparelho.').waitFor();
  await editTransaction(a.page, 'Aluguel', 'Descrição', 'Aluguel outubro');
  await a.page.getByText('Alteração salva neste aparelho.', { exact: false }).waitFor();
  await editTransaction(a.page, 'Internet', 'Valor (R$)', '120,00');
  await a.page.getByText('Alteração salva neste aparelho.', { exact: false }).waitFor();
  await editTransaction(a.page, 'Academia', 'Descrição', 'Academia anual');
  await a.page.getByText('Alteração salva neste aparelho.', { exact: false }).waitFor();
  await deleteTransaction(a.page, 'Streaming');
  await a.page.getByText('Exclusão salva neste aparelho.', { exact: false }).waitFor();

  await editTransaction(b.page, 'Aluguel', 'Valor (R$)', '1.100,00');
  await b.page.getByText('Lançamento atualizado.').waitFor();
  await editTransaction(b.page, 'Internet', 'Valor (R$)', '110,00');
  await b.page.getByText('Lançamento atualizado.').waitFor();
  await deleteTransaction(b.page, 'Academia');
  await b.page.getByText('Lançamento excluído.', { exact: false }).waitFor();
  await editTransaction(b.page, 'Streaming', 'Valor (R$)', '45,00');
  await b.page.getByText('Lançamento atualizado.').waitFor();

  await a.context.setOffline(false);
  const pending = a.page.getByRole('region', { name: 'Não sincronizado' });

  await step('independent changes to the same transaction merge automatically', async () => {
    await visible(a.page.getByText('3 alterações precisam da sua atenção.')).waitFor({
      timeout: 30_000,
    });
    await visible(
      a.page.getByRole('button', { name: /^Despesa: Aluguel outubro, .*R\$\s1\.100,00/ }),
    ).waitFor();
  });

  await step('a field changed on both sides asks which value to keep', async () => {
    const choice = pending.getByRole('radiogroup', { name: 'Valor: qual valor manter?' });
    await choice.getByRole('radio', { name: /^Versão atual: R\$\s110,00$/ }).waitFor();
    await choice.getByRole('radio', { name: /^Minha versão: R\$\s120,00$/ }).click();
    await pending.getByRole('button', { name: 'Aplicar escolhas' }).click();
    await visible(
      a.page.getByRole('button', { name: /^Despesa: Internet, .*R\$\s120,00/ }),
    ).waitFor();
  });

  await step(
    'an edit of a transaction deleted elsewhere can restore it with the edit',
    async () => {
      await pending.getByText('foi excluído em outro lugar', { exact: false }).waitFor();
      await pending.getByRole('button', { name: 'Restaurar e aplicar minha alteração' }).click();
      await visible(row(a.page, 'Despesa', 'Academia anual')).waitFor();
    },
  );

  await step('a deletion of a transaction edited elsewhere can keep the other change', async () => {
    await pending.getByText('Valor: R$ 40,00 → R$ 45,00').waitFor();
    await pending.getByRole('button', { name: 'Manter o lançamento' }).click();
    await pending.waitFor({ state: 'detached' });
    await visible(
      a.page.getByRole('button', { name: /^Despesa: Streaming, .*R\$\s45,00/ }),
    ).waitFor();
  });

  await visible(a.page.getByRole('button', { name: 'Histórico de alterações' })).click();
  await step('the audit history records how each conflict was resolved', async () => {
    for (const expected of [
      'Sincronização offline: mesclado automaticamente',
      'Sincronização offline: valores escolhidos pelo usuário',
      'Sincronização offline: restaurado para aplicar a alteração',
    ]) {
      await visible(a.page.getByLabel(expected, { exact: false }))
        .first()
        .waitFor();
    }
  });
}
