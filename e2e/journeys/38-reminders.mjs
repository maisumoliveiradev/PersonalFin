import { addTransaction, localDate, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });

export default async function remindersJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Lembretes Teste');
  for (const [description, days] of [
    ['Conta de luz', 0],
    ['Internet', 2],
    ['Academia', 5],
  ]) {
    await addTransaction(page, {
      description,
      amount: '50,00',
      date: localDate(days),
      category: 'Moradia',
      pending: true,
    });
  }
  const panel = visible(page.getByRole('region', { name: 'Lembretes' }));

  await step('pending expenses due within the default offsets are reminded', async () => {
    await panel.getByText('Despesa Conta de luz: R$ 50,00, vence hoje').waitFor();
    await panel.getByText('Despesa Internet: R$ 50,00, vence em 2 dias').waitFor();
    if ((await panel.getByText(/Academia/).count()) !== 0) {
      throw new Error('Academia is outside the default window');
    }
  });

  await panel.getByRole('button', { name: /^Dispensar lembrete: Despesa Internet/ }).click();
  await step('a dismissed reminder disappears', async () => {
    await panel.getByText(/Despesa Internet/).waitFor({ state: 'detached' });
  });

  await panel.getByRole('button', { name: 'Configurar lembretes' }).click();
  await page.getByRole('checkbox', { name: '7 dias antes' }).click();
  await page.getByRole('button', { name: 'Salvar lembretes' }).click();
  await page.getByText('Lembretes salvos.').waitFor();
  await page.getByRole('button', { name: 'Voltar ao espaço' }).click();
  await step('adding the seven-day offset reminds items further ahead', async () => {
    await panel.getByText('Despesa Academia: R$ 50,00, vence em 5 dias').waitFor();
  });

  await visible(page.getByRole('button', { name: 'Marcar como pago: Conta de luz' })).click();
  await step('paying an item removes its reminder', async () => {
    await panel.getByText(/Conta de luz/).waitFor({ state: 'detached' });
  });
}
