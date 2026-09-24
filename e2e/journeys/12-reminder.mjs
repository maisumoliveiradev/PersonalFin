import { field, localDate, newPage, radio, signUpWithSpace } from '../helpers.mjs';

export default async function reminderJourney({ browser, step }) {
  const page = await newPage(browser);
  const spaceUrl = await signUpWithSpace(page, 'Lembrete Teste');
  const prompt = () => page.getByRole('region', { name: 'Qual é o seu saldo hoje?' });
  await step('a space without balance shows the prompt', () => prompt().waitFor());
  await page.getByRole('button', { name: 'Depois' }).click();
  await step('"Depois" hides it for this session', () => prompt().waitFor({ state: 'detached' }));
  await page.reload({ waitUntil: 'networkidle' });
  await step('it returns on the next app start', () => prompt().waitFor());
  await page.getByRole('button', { name: 'Informar saldo' }).click();
  await field(page, 'Saldo (R$)').fill('1.000,00');
  await field(page, 'Data do saldo').fill(localDate(-20));
  await page.getByRole('button', { name: 'Salvar saldo' }).click();
  await step('an old balance keeps the default 7-day reminder due', async () => {
    await page.getByText('R$ 1.000,00', { exact: true }).first().waitFor();
    await prompt().waitFor();
  });
  await page.getByRole('button', { name: 'Histórico de saldos' }).click();
  await radio(page, 'Frequência', 'A cada N dias').click();
  await field(page, 'Intervalo em dias (1 a 90)').fill('0');
  await page.getByRole('button', { name: 'Salvar lembrete' }).click();
  await step('invalid interval is rejected', () =>
    page.getByText('Informe um número de 1 a 90.').waitFor(),
  );
  await field(page, 'Intervalo em dias (1 a 90)').fill('30');
  await page.getByRole('button', { name: 'Salvar lembrete' }).click();
  await step('reminder is saved', () => page.getByText('Lembrete salvo.').waitFor());
  await page.goto(spaceUrl, { waitUntil: 'networkidle' });
  await step('a 20-day-old balance is not due with 30 days', async () => {
    await page.getByText('R$ 1.000,00', { exact: true }).first().waitFor();
    if (await prompt().count()) {
      throw new Error('prompt shown');
    }
  });
}
