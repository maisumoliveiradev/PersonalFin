import { field, signUpWithSpace } from '../helpers.mjs';

const visible = (locator) => locator.filter({ visible: true });
const text = (page, value) => visible(page.getByText(value, { exact: true }));

export default async function goalsJourney({ browser, step }) {
  const context = await browser.newContext({ timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await signUpWithSpace(page, 'Metas Teste');

  await visible(page.getByRole('button', { name: 'Metas' })).click();
  await field(page, 'Nome da meta').fill('Viagem em família');
  await field(page, 'Valor alvo (R$)').fill('3.000,00');
  await field(page, 'Data alvo (opcional)').fill('31/12/2027');
  await page.getByRole('button', { name: 'Criar meta' }).click();

  await step('a space goal starts at zero progress', async () => {
    await text(page, 'Meta criada.').waitFor();
    await visible(
      page.getByRole('button', {
        name: /^Viagem em família.*R\$\s0,00 de R\$\s3\.000,00 \(0,0%\)/,
      }),
    ).waitFor();
  });

  await visible(page.getByRole('button', { name: /^Viagem em família/ })).click();
  await field(page, 'Valor acumulado hoje (R$)').fill('1.000,00');
  await page.getByRole('button', { name: 'Salvar valor acumulado' }).click();
  await step('updating the accumulated amount shows progress and history', async () => {
    await text(page, 'Valor acumulado atualizado.').waitFor();
    await text(page, 'R$ 1.000,00 de R$ 3.000,00 (33,3%)').waitFor();
    await text(page, 'Faltam R$ 2.000,00').waitFor();
    await text(page, 'Data alvo: 31/12/2027').waitFor();
    await visible(page.getByText(/^R\$\s1\.000,00 em \d{2}\/\d{2}\/\d{4}/)).waitFor();
    await page
      .getByRole('progressbar', { name: 'Progresso de Viagem em família: 33,3%' })
      .waitFor();
  });

  await field(page, 'Valor acumulado hoje (R$)').fill('3.500,00');
  await page.getByRole('button', { name: 'Salvar valor acumulado' }).click();
  await step('passing the target marks the goal as reached', async () => {
    await text(page, 'Meta atingida').waitFor();
    await text(page, 'R$ 3.500,00 de R$ 3.000,00 (100,0%)').waitFor();
  });

  await page.getByRole('button', { name: 'Voltar às metas' }).click();
  await visible(page.getByRole('button', { name: 'Voltar ao espaço' })).click();
  await step('goals do not change the month summary', async () => {
    await page.getByRole('region', { name: 'Resumo do mês' }).waitFor();
    await visible(page.getByLabel('Despesas realizadas: R$ 0,00')).waitFor();
  });

  await visible(page.getByRole('button', { name: 'Trocar de espaço' })).click();
  await visible(page.getByRole('button', { name: 'Minhas metas' })).click();
  await step('global goals are separate from space goals', async () => {
    await text(page, 'Nenhuma meta criada.').waitFor();
    await field(page, 'Nome da meta').fill('Reserva de emergência');
    await field(page, 'Valor alvo (R$)').fill('10.000,00');
    await page.getByRole('button', { name: 'Criar meta' }).click();
    await visible(page.getByRole('button', { name: /^Reserva de emergência/ })).waitFor();
  });
}
