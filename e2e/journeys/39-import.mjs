import { addTransaction, radio, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });
const text = (page, value) => visible(page.getByText(value, { exact: true }));

const CSV = [
  'Data;Descrição;Valor;Categoria;Situação',
  '05/10/2026;Padaria;-12,50;Alimentação;Pago',
  '06/10/2026;Salário;5.000,00;Salário;Recebido',
  '07/10/2026;Algo novo;-30,00;Categoria inexistente;Pago',
  '31/02/2026;Data ruim;-1,00;Alimentação;Pago',
  '08/10/2026;Mercado;-99,90;alimentacao;Pendente',
  '08/10/2026;Mercado de novo;-99,90;Alimentação;Pago',
].join('\r\n');

export default async function importJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Importacao Teste');
  await addTransaction(page, {
    description: 'Padaria da esquina',
    amount: '12,50',
    date: '05/10/2026',
    category: 'Alimentação',
  });

  await visible(page.getByRole('button', { name: 'Importar planilha' })).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Escolher arquivo (CSV ou Excel)' }).click();
  await (await chooser).setFiles({
    name: 'extrato.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV, 'utf8'),
  });

  await step('the file is read and the columns are suggested from the header', async () => {
    await page.getByRole('heading', { name: 'extrato.csv' }).waitFor();
    await radio(page, 'Coluna da data', 'Coluna 1: Data')
      .and(page.getByRole('radio', { checked: true }))
      .waitFor();
    await radio(page, 'Coluna da categoria', 'Coluna 4: Categoria')
      .and(page.getByRole('radio', { checked: true }))
      .waitFor();
  });

  await page.getByRole('button', { name: 'Validar linhas' }).click();
  await step('validation lists errors and suspected duplicates without importing', async () => {
    await text(page, '4 linha(s) válida(s), 3 com erro, 2 possível(is) duplicado(s)').waitFor();
    await text(page, 'Linha 4: categoria não encontrada').waitFor();
    await text(page, 'Linha 5: data inválida').waitFor();
    await text(page, 'Decida 2 possível(is) duplicado(s) antes de importar.').waitFor();
  });

  await radio(
    page,
    'Linha 2: Padaria, R$ 12,50 em 05/10/2026 — já existe: Padaria da esquina',
    'Ignorar',
  ).click();
  await radio(
    page,
    'Linha 7: Mercado de novo, R$ 99,90 em 08/10/2026 — repete a linha 6',
    'Importar',
  ).click();
  await step('every duplicate needs an explicit decision before importing', async () => {
    await page.getByRole('button', { name: 'Importar 3 lançamento(s)' }).waitFor();
    await page.getByText('antes de importar.').waitFor({ state: 'detached' });
  });

  await page.getByRole('button', { name: 'Importar 3 lançamento(s)' }).click();
  await step('confirming imports only the chosen rows', async () => {
    await text(page, '3 lançamento(s) importado(s).').waitFor();
  });

  await page.getByRole('button', { name: 'Desfazer importação' }).click();
  await step('an import can be undone into the trash', async () => {
    await text(page, 'Importação desfeita. Os lançamentos estão na Lixeira.').waitFor();
  });
}
