import { BASE, field, newPage, radio, signUp, signUpWithSpace, uniqueEmail } from '../helpers.mjs';

export default async function ownershipJourney({ browser, step }) {
  const owner = await newPage(browser);
  const spaceUrl = await signUpWithSpace(owner, 'Dona Antiga');
  const heirEmail = uniqueEmail('herdeiro');
  const heir = await newPage(browser);
  await signUp(heir, 'Nova Dona', heirEmail);
  await heir.getByRole('button', { name: 'Criar espaço' }).waitFor();

  await owner.goto(`${spaceUrl}/members`, { waitUntil: 'networkidle' });
  await field(owner, 'E-mail da pessoa').fill(heirEmail);
  await radio(owner, 'Acesso', 'Visualizador').click();
  await owner.getByRole('button', { name: 'Criar convite' }).click();
  const link = owner.getByLabel('Link do convite');
  await link.waitFor();
  await heir.goto(`${BASE}${new URL(await link.innerText()).pathname}`, {
    waitUntil: 'networkidle',
  });
  await heir.getByRole('button', { name: 'Aceitar convite' }).click();
  await heir.getByText('Membro', { exact: true }).waitFor();

  await owner.goto(`${spaceUrl}/members`, { waitUntil: 'networkidle' });
  await step('the owner cannot leave before transferring', async () => {
    if (await owner.getByRole('button', { name: 'Sair do espaço' }).count()) {
      throw new Error('owner offered to leave');
    }
  });
  await owner.getByRole('button', { name: 'Transferir propriedade para Nova Dona' }).click();
  await owner.getByRole('button', { name: 'Confirmar transferência' }).click();
  await step(
    'ownership moves to the member and the previous owner becomes administrator',
    async () => {
      await owner.getByLabel('Nova Dona: Proprietário', { exact: true }).waitFor();
      await owner.getByLabel('Dona Antiga: Administrador', { exact: true }).waitFor();
    },
  );
  await heir.goto(spaceUrl, { waitUntil: 'networkidle' });
  await step('the new owner has full access', () =>
    heir.getByRole('button', { name: 'Novo lançamento' }).waitFor(),
  );
  await owner.getByRole('button', { name: 'Sair do espaço' }).click();
  await owner.getByRole('button', { name: 'Confirmar saída' }).click();
  await step('the previous owner can now leave', () =>
    owner.getByRole('button', { name: 'Criar espaço' }).waitFor(),
  );
}
