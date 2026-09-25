import { API, addTransaction, field, localDate, radio, row, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });

async function newOfflineExpense(page, description, amount) {
  await visible(page.getByRole('button', { name: 'Novo lançamento' })).click();
  await field(page, 'Descrição').fill(description);
  await field(page, 'Valor (R$)').fill(amount);
  await radio(page, 'Categoria', 'Alimentação').click();
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
}

export default async function offlineTransactionsJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Offline Escrita');
  const today = localDate();
  for (const [description, pending] of [
    ['Mercado', true],
    ['Cinema', false],
    ['Farmacia', false],
  ]) {
    await addTransaction(page, {
      description,
      amount: '20,00',
      date: today,
      category: 'Alimentação',
      pending,
    });
  }
  await visible(row(page, 'Despesa', 'Farmacia')).waitFor();
  await page.waitForTimeout(1500);

  await context.setOffline(true);
  await page.getByText('Sem conexão. Mostrando os dados salvos neste aparelho.').waitFor();

  await newOfflineExpense(page, 'Padaria offline', '8,00');
  await step(
    'a transaction created offline is saved on the device and listed as not synchronized',
    async () => {
      await page.getByText('Lançamento salvo neste aparelho.', { exact: false }).waitFor();
      const pending = page.getByRole('region', { name: 'Não sincronizado' });
      await pending
        .getByLabel(/^Novo lançamento: Padaria offline, R\$\s8,00, .*Aguardando envio$/)
        .waitFor();
      await visible(page.getByText('Sem conexão. 1 alteração aguardando envio.')).waitFor();
    },
  );

  const toggle = visible(page.getByRole('button', { name: 'Marcar como pago: Mercado' }));
  await toggle.click({ timeout: 5000 }).catch(async (error) => {
    if ((await toggle.count()) !== 0) {
      throw error;
    }
  });
  await step('an offline status change marks the row and blocks further changes', async () => {
    await visible(row(page, 'Despesa', 'Mercado'))
      .and(page.getByLabel(/Alteração não sincronizada/))
      .waitFor();
    if (
      (await visible(page.getByRole('button', { name: 'Marcar como pago: Mercado' })).count()) !== 0
    ) {
      throw new Error('status toggle still offered for a queued transaction');
    }
    await visible(row(page, 'Despesa', 'Mercado')).click();
    await page
      .getByText('Este lançamento tem uma alteração aguardando envio.', { exact: false })
      .waitFor();
    await visible(page.getByRole('button', { name: 'Trocar de espaço' })).click();
    await visible(row(page, 'Despesa', 'Cinema')).waitFor();
  });

  await visible(row(page, 'Despesa', 'Cinema')).click();
  await field(page, 'Descrição').fill('Cinema IMAX');
  await page.getByRole('button', { name: 'Salvar lançamento' }).click();
  await step('an offline edit is saved on the device', async () => {
    await page.getByText('Alteração salva neste aparelho.', { exact: false }).waitFor();
  });

  await visible(row(page, 'Despesa', 'Farmacia')).click();
  await page.getByRole('button', { name: 'Excluir lançamento' }).click();
  await page.getByRole('button', { name: 'Sim, excluir' }).click();
  await step('an offline deletion is saved on the device', async () => {
    await page.getByText('Exclusão salva neste aparelho.', { exact: false }).waitFor();
    await visible(page.getByText('Sem conexão. 4 alterações aguardando envio.')).waitFor();
  });

  await newOfflineExpense(page, 'Engano', '1,00');
  await page.getByText('Lançamento salvo neste aparelho.', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Descartar: Engano' }).click();
  await page.getByRole('button', { name: 'Sim, descartar' }).click();
  await step('a change can be discarded explicitly before it is sent', async () => {
    await page.getByLabel(/^Novo lançamento: Engano/).waitFor({ state: 'detached' });
  });

  await visible(page.getByRole('button', { name: 'Trocar de espaço' })).click();
  await visible(page.getByRole('button', { name: 'Sair' })).click();
  await step('signing out with unsynchronized changes asks for confirmation', async () => {
    await page
      .getByText('Há 4 alterações neste aparelho que ainda não foram enviadas.', { exact: false })
      .waitFor();
    await page.getByRole('button', { name: 'Continuar conectado' }).click();
  });
  await visible(page.getByRole('button', { name: /^Pessoal/ })).click();

  await context.setOffline(false);
  await step('reconnecting sends every change and refreshes the space', async () => {
    await page
      .getByRole('region', { name: 'Não sincronizado' })
      .waitFor({ state: 'detached', timeout: 30_000 });
    await visible(page.getByText('Tudo sincronizado.')).waitFor();
    await visible(row(page, 'Despesa', 'Padaria offline')).waitFor();
    await visible(row(page, 'Despesa', 'Cinema IMAX')).waitFor();
    await visible(row(page, 'Despesa', 'Mercado').and(page.getByLabel(/Pago$/))).waitFor();
    if ((await visible(row(page, 'Despesa', 'Farmacia')).count()) !== 0) {
      throw new Error('deleted transaction still listed');
    }
  });

  let lostResponses = 0;
  await page.route(`${API}/financial-spaces/*/transactions`, async (route) => {
    if (route.request().method() !== 'POST' || lostResponses > 0) {
      await route.continue();
      return;
    }
    lostResponses += 1;
    await route.fetch();
    await route.abort('connectionreset');
  });
  await newOfflineExpense(page, 'Resposta perdida', '5,00');
  await step('a create whose response was lost is retried without duplicating it', async () => {
    await page.getByText('Lançamento salvo neste aparelho.', { exact: false }).waitFor();
    await page
      .getByRole('region', { name: 'Não sincronizado' })
      .waitFor({ state: 'detached', timeout: 30_000 });
    await visible(row(page, 'Despesa', 'Resposta perdida')).waitFor();
    const count = await visible(row(page, 'Despesa', 'Resposta perdida')).count();
    if (lostResponses !== 1 || count !== 1) {
      throw new Error(`lost responses ${lostResponses}, rows ${count}`);
    }
  });
}
