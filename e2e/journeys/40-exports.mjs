import { readFile } from 'node:fs/promises';

import { addTransaction, localDate, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });

async function download(page, label) {
  const event = page.waitForEvent('download');
  await visible(page.getByRole('button', { name: label })).click();
  const file = await event;
  return { name: file.suggestedFilename(), bytes: await readFile(await file.path()) };
}

export default async function exportsJourney({ browser, step }) {
  const context = await browser.newContext({
    timezoneId: 'America/Sao_Paulo',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Exportacao Teste');
  await addTransaction(page, {
    description: 'Padaria',
    amount: '12,50',
    date: localDate(),
    category: 'Alimentação',
  });
  await addTransaction(page, {
    income: true,
    description: 'Freela',
    amount: '1.500,00',
    date: localDate(),
    category: 'Receitas',
  });

  const csv = await download(page, 'Exportar os lançamentos filtrados em CSV');
  await step('the CSV export has the month transactions with exact amounts', async () => {
    const text = csv.bytes.toString('utf8').replace(/^﻿/, '');
    const lines = text.trim().split('\r\n');
    if (!/^lancamentos-\d{4}-\d{2}\.csv$/.test(csv.name) || lines.length !== 3) {
      throw new Error(`${csv.name}: ${text}`);
    }
    if (!text.includes(';Despesa;Padaria;Alimentação;;12,50;-12,50;BRL;Pago;')) {
      throw new Error(text);
    }
    if (!text.includes(';Receita;Freela;Receitas;;1500,00;1500,00;BRL;Recebido;')) {
      throw new Error(text);
    }
    await visible(page.getByText(`Arquivo ${csv.name} gerado.`)).waitFor();
  });

  const xlsx = await download(page, 'Exportar os lançamentos filtrados em Excel');
  await step('the Excel export is a spreadsheet file', async () => {
    if (!xlsx.name.endsWith('.xlsx') || xlsx.bytes.subarray(0, 2).toString() !== 'PK') {
      throw new Error(`${xlsx.name} is not an xlsx file`);
    }
  });
}
