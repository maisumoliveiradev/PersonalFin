import { addTransaction, field, newPage, signUpWithSpace } from '../helpers.mjs';

export default async function dashboardPreferencesJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Preferencias Teste');
  const summary = () => page.getByRole('region', { name: 'Resumo do mês' });
  const series = () => page.getByRole('region', { name: 'Projeção dos próximos meses' });
  const visibleButton = (name) =>
    page.getByRole('button', { name, exact: true }).filter({ visible: true });

  await page.getByRole('button', { name: 'Atualizar saldo' }).first().click();
  await field(page, 'Saldo (R$)').fill('1.000,00');
  await page.getByRole('button', { name: 'Salvar saldo' }).click();
  await page.getByText('Informado para', { exact: false }).first().waitFor();
  await addTransaction(page, {
    description: 'Mercado',
    amount: '100,00',
    date: new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(new Date()),
    category: 'Alimentação',
  });
  await step('the default shows every section', async () => {
    await summary().getByText('Previsto (pendente)').waitFor();
    await series().waitFor();
    await visibleButton('Análises').waitFor();
  });

  await visibleButton('Personalizar resumo').click();
  await page
    .getByRole('radiogroup', { name: 'Perfil de experiência' })
    .getByRole('radio', { name: 'Básico', exact: true })
    .click();
  await page.getByText('Preferências salvas.').waitFor();
  await page.getByRole('button', { name: 'Voltar ao espaço' }).click();
  await step('the basic profile keeps only the balance and realized summary', async () => {
    await summary().getByLabel('Despesas realizadas: R$ 100,00', { exact: true }).waitFor();
    if (await summary().getByText('Previsto (pendente)').count()) {
      throw new Error('forecast still shown');
    }
    if ((await series().count()) || (await visibleButton('Análises').count())) {
      throw new Error('advanced sections still shown');
    }
    await page.getByText('Saldo observado', { exact: true }).first().waitFor();
  });

  await visibleButton('Personalizar resumo').click();
  await page
    .getByRole('group', { name: 'Seções visíveis' })
    .getByRole('checkbox', { name: 'Análises', exact: true })
    .click();
  await page.getByText('Preferências salvas.').waitFor();
  await step('a single section can be shown on top of the profile', async () => {
    const checked = await page
      .getByRole('group', { name: 'Seções visíveis' })
      .getByRole('checkbox', { name: 'Análises', exact: true })
      .getAttribute('aria-checked');
    if (checked !== 'true') {
      throw new Error('analytics not checked');
    }
  });
  await page.getByRole('button', { name: 'Voltar ao espaço' }).click();
  await step('the space screen follows the saved preferences', async () => {
    await visibleButton('Análises').waitFor();
    if (await visibleButton('Próximos compromissos').count()) {
      throw new Error('commitments shown for basic profile');
    }
  });
}
