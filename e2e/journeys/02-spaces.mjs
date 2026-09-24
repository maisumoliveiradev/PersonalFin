import { field, newPage, signUp } from '../helpers.mjs';

export default async function spacesJourney({ browser, step }) {
  const ana = await newPage(browser);
  await signUp(ana, 'Ana Espaco');
  await step('new user sees first-space onboarding', () =>
    ana.getByRole('heading', { name: 'Crie seu primeiro espaço financeiro' }).waitFor(),
  );
  await step('name is suggested as Pessoal', async () => {
    if ((await field(ana, 'Nome do espaço').inputValue()) !== 'Pessoal') {
      throw new Error('name not suggested');
    }
  });
  await field(ana, 'Nome do espaço').fill('   ');
  await ana.getByRole('button', { name: 'Criar espaço' }).click();
  await step('blank name is rejected', () =>
    ana.getByText('Informe um nome para o espaço.').waitFor(),
  );
  await field(ana, 'Nome do espaço').fill('Pessoal');
  await ana.getByRole('button', { name: 'Criar espaço' }).click();
  await step('creating enters the space', () =>
    ana.getByRole('heading', { name: 'Pessoal', exact: true }).waitFor(),
  );
  const spaceUrl = ana.url().split('?')[0];
  await ana.getByRole('button', { name: 'Trocar de espaço' }).click();
  await ana.getByRole('button', { name: 'Novo espaço' }).click();
  await field(ana, 'Nome do espaço').fill('Casa');
  await ana.getByRole('button', { name: 'Criar espaço' }).click();
  await step('a second space can be created', () =>
    ana.getByRole('heading', { name: 'Casa', exact: true }).waitFor(),
  );
  await ana.getByRole('button', { name: 'Trocar de espaço' }).click();
  await ana.getByRole('button', { name: /^Pessoal/ }).click();
  await step('user selects and enters a space', () =>
    ana.getByRole('heading', { name: 'Pessoal', exact: true }).waitFor(),
  );

  const bruno = await newPage(browser);
  await signUp(bruno, 'Bruno Espaco');
  await bruno.getByRole('heading', { name: 'Crie seu primeiro espaço financeiro' }).waitFor();
  await step("another user does not see Ana's spaces", async () => {
    if (await bruno.getByText('Casa', { exact: true }).count()) {
      throw new Error('space leaked');
    }
  });
  await bruno.goto(spaceUrl, { waitUntil: 'networkidle' });
  await step("another user cannot open Ana's space by URL", () =>
    bruno.getByText('Espaço não encontrado ou sem acesso.').waitFor(),
  );
}
