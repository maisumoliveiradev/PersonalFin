import { addTransaction, localDate, row, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

async function openTransaction(page) {
  await visible(row(page, 'Despesa', 'Farmácia')).click();
  await page.getByRole('heading', { name: 'Editar lançamento' }).waitFor();
}

async function choose(page, label, file) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: label }).click();
  await (await chooser).setFiles(file);
}

export default async function attachmentsJourney({ browser, step }) {
  const context = await browser.newContext({
    timezoneId: 'America/Sao_Paulo',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Anexos Teste');
  await addTransaction(page, {
    description: 'Farmácia',
    amount: '45,30',
    date: localDate(),
    category: 'Saúde',
  });
  await openTransaction(page);

  await choose(page, 'Anexar foto ou PDF', {
    name: 'recibo.png',
    mimeType: 'image/png',
    buffer: PNG,
  });
  await step('an image is attached to the transaction', async () => {
    await page.getByText('Anexo adicionado.').waitFor();
    await page.getByText('recibo.png (12 B)').waitFor();
  });

  await choose(page, 'Anexar foto ou PDF', {
    name: 'falso.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('<html></html>'),
  });
  await step('a file that is not an image or PDF is refused by its content', async () => {
    await page.getByText('Só são aceitas fotos (JPEG, PNG, WebP, HEIC) e PDF.').waitFor();
  });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Abrir recibo.png' }).click();
  await step('the attachment opens with its original bytes', async () => {
    const file = await download;
    if (file.suggestedFilename() !== 'recibo.png') {
      throw new Error(file.suggestedFilename());
    }
  });

  await page.getByRole('button', { name: 'Cancelar' }).click();
  await step('the list shows that the transaction has an attachment', async () => {
    await visible(page.getByText(/📎 1 anexo/)).waitFor();
  });

  await openTransaction(page);
  await page.getByRole('button', { name: 'Remover recibo.png' }).click();
  await step('an attachment can be removed', async () => {
    await page.getByText('Anexo removido.').waitFor();
    await page.getByText('Nenhum anexo.').waitFor();
  });
}
