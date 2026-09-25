import { readFile } from 'node:fs/promises';

import { addTransaction, localDate, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });

export default async function backupJourney({ browser, step }) {
  const context = await browser.newContext({
    timezoneId: 'America/Sao_Paulo',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Backup Teste');
  await addTransaction(page, {
    description: 'Padaria',
    amount: '12,50',
    date: localDate(),
    category: 'Alimentação',
  });
  await visible(page.getByRole('button', { name: 'Trocar de espaço' })).click();

  const event = page.waitForEvent('download');
  await visible(page.getByRole('button', { name: 'Baixar backup dos meus dados' })).click();
  const file = await event;
  const backup = JSON.parse(await readFile(await file.path(), 'utf8'));

  await step('the backup is a versioned JSON with the space data', async () => {
    if (backup.format !== 'personalfin-backup' || backup.formatVersion !== 1) {
      throw new Error(JSON.stringify(backup).slice(0, 200));
    }
    const transactions = backup.spaces[0]?.tables?.financial_transaction ?? [];
    if (transactions.length !== 1 || transactions[0].amount_minor !== 1250) {
      throw new Error(JSON.stringify(transactions));
    }
    await visible(page.getByText(`Backup ${file.suggestedFilename()} gerado.`)).waitFor();
  });
}
