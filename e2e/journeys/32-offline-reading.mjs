import { API, addTransaction, localDate, row, signUpWithSpace } from '../helpers.mjs';

const BANNER = 'Sem conexão. Mostrando os dados salvos neste aparelho.';

async function storedCacheKeys(page) {
  return page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) => key.startsWith('personalfin:query-cache:')),
  );
}

export default async function offlineReadingJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  const spaceUrl = await signUpWithSpace(page, 'Offline Leitura');
  await addTransaction(page, {
    description: 'Padaria',
    amount: '12,50',
    date: localDate(),
    category: 'Alimentação',
  });
  await row(page, 'Despesa', 'Padaria').filter({ visible: true }).waitFor();
  await page.waitForTimeout(1500);

  await step('the loaded data is saved on the device', async () => {
    if ((await storedCacheKeys(page)).length !== 1) {
      throw new Error('no persisted query cache');
    }
  });

  await context.setOffline(true);
  await step('going offline shows the banner and keeps the data visible', async () => {
    await page.getByText(BANNER).waitFor();
    await row(page, 'Despesa', 'Padaria').filter({ visible: true }).waitFor();
    await page.getByRole('region', { name: 'Resumo do mês' }).waitFor();
  });

  await step('screens visited before open offline from saved data', async () => {
    await page.getByRole('button', { name: 'Trocar de espaço' }).filter({ visible: true }).click();
    await page.getByText('Seus espaços financeiros').filter({ visible: true }).waitFor();
    await page
      .getByRole('button', { name: /^Pessoal/ })
      .filter({ visible: true })
      .click();
    await row(page, 'Despesa', 'Padaria').filter({ visible: true }).waitFor();
  });

  await context.setOffline(false);
  await step('reconnecting hides the banner', async () => {
    await page.getByText(BANNER).waitFor({ state: 'detached' });
  });

  const restarted = await context.newPage();
  restarted.setDefaultTimeout(15_000);
  await restarted.route(`${API}/financial-spaces/**`, (route) =>
    route.abort('internetdisconnected'),
  );
  await restarted.route(`${API}/me`, (route) => route.abort('internetdisconnected'));
  await restarted.goto(spaceUrl);
  await step('restarting without reaching the server shows the saved data', async () => {
    await restarted.getByText(BANNER).waitFor();
    await row(restarted, 'Despesa', 'Padaria').filter({ visible: true }).waitFor();
  });

  await restarted.unrouteAll();
  await restarted.getByText(BANNER).waitFor({ state: 'detached', timeout: 20_000 });
  await restarted
    .getByRole('button', { name: 'Trocar de espaço' })
    .filter({ visible: true })
    .click();
  await restarted.getByRole('button', { name: 'Sair' }).filter({ visible: true }).click();
  await restarted.getByRole('button', { name: 'Entrar', exact: true }).waitFor();
  await restarted.waitForTimeout(1500);
  await step('signing out removes the saved data', async () => {
    if ((await storedCacheKeys(restarted)).length !== 0) {
      throw new Error('query cache still stored after sign-out');
    }
  });
}
