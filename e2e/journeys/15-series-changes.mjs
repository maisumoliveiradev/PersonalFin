import { field, newPage, radio, row, signUpWithSpace } from '../helpers.mjs';

export default async function seriesChangesJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Serie Teste');
  const amountOf = (value) => page.getByText(`−R$ ${value}`, { exact: true });
  const openMonth = (month) =>
    page.goto(`${spaceUrl}?month=${month}`, { waitUntil: 'networkidle' });
  const save = () => page.getByRole('button', { name: 'Salvar lançamento' }).click();

  await page.getByRole('button', { name: 'Novo lançamento' }).click();
  await field(page, 'Descrição').fill('Academia');
  await field(page, 'Valor (R$)').fill('100,00');
  await field(page, 'Data').fill('10/01/2026');
  await radio(page, 'Categoria', 'Saúde').click();
  await radio(page, 'Repetir', 'Mensal').click();
  await save();
  await page.getByText(/Recorrência criada/).waitFor();

  await row(page, 'Despesa', 'Academia').click();
  await step('an occurrence offers "Apenas este" and "Este e os próximos"', () =>
    radio(page, 'Aplicar alterações a', 'Este e os próximos').waitFor(),
  );
  await radio(page, 'Aplicar alterações a', 'Este e os próximos').click();
  await field(page, 'Data').fill('11/01/2026');
  await save();
  await step('"Este e os próximos" refuses date changes', () =>
    page
      .getByText('Para mudar data, tipo ou situação, use "Apenas este".', { exact: false })
      .waitFor(),
  );
  await field(page, 'Data').fill('10/01/2026');
  await field(page, 'Valor (R$)').fill('120,00');
  await save();
  await step('"Este e os próximos" updates this and later occurrences', async () => {
    await page.getByText('Lançamento atualizado.').waitFor();
    await amountOf('120,00').waitFor();
    await openMonth('2026-02');
    await amountOf('120,00').waitFor();
  });

  await row(page, 'Despesa', 'Academia').click();
  await field(page, 'Valor (R$)').fill('90,00');
  await save();
  await step('"Apenas este" changes only that occurrence', async () => {
    await amountOf('90,00').waitFor();
    await openMonth('2026-03');
    await amountOf('120,00').waitFor();
  });

  await openMonth('2026-01');
  await row(page, 'Despesa', 'Academia').click();
  await radio(page, 'Aplicar alterações a', 'Este e os próximos').click();
  await field(page, 'Valor (R$)').fill('150,00');
  await save();
  await step('a later series change skips the individually edited occurrence', async () => {
    await amountOf('150,00').waitFor();
    await openMonth('2026-02');
    await amountOf('90,00').waitFor();
    await openMonth('2026-03');
    await amountOf('150,00').waitFor();
  });

  await page.getByRole('button', { name: 'Recorrências' }).click();
  await page.getByRole('button', { name: 'Encerrar: Academia' }).click();
  await field(page, 'Último dia da recorrência').fill('15/03/2026');
  await page.getByRole('button', { name: 'Confirmar encerramento' }).click();
  await step('ending the series trashes later forecast occurrences', async () => {
    await page
      .getByText(/Recorrência encerrada\. \d+ lançamentos previstos foram para a Lixeira\./)
      .waitFor();
    await page.getByText('Mensal · desde 10/01/2026 · até 15/03/2026').waitFor();
  });
  await openMonth('2026-04');
  await step('no occurrence after the end date', async () => {
    await page.getByText('Nenhum lançamento neste mês.').waitFor();
  });
  await openMonth('2026-02');
  await step('earlier occurrences are kept', () => amountOf('90,00').waitFor());
}
