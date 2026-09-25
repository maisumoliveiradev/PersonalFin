import { BASE, field, newPage, radio, signUp, signUpWithSpace, uniqueEmail } from '../helpers.mjs';

export default async function membersJourney({ browser, step }) {
  const owner = await newPage(browser);
  const spaceUrl = await signUpWithSpace(owner, 'Dona Membros');
  const guestEmail = uniqueEmail('membro');
  const guest = await newPage(browser);
  await signUp(guest, 'Membro Teste', guestEmail);
  await guest.getByRole('button', { name: 'Criar espaço' }).waitFor();

  const inviteAndAccept = async () => {
    await owner.goto(`${spaceUrl}/members`, { waitUntil: 'networkidle' });
    await field(owner, 'E-mail da pessoa').fill(guestEmail);
    await radio(owner, 'Acesso', 'Colaborador').click();
    await owner.getByRole('button', { name: 'Criar convite' }).click();
    const link = owner.getByLabel('Link do convite');
    await link.waitFor();
    const path = new URL(await link.innerText()).pathname;
    await guest.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
    await guest.getByRole('button', { name: 'Aceitar convite' }).click();
    await guest.getByText('Membro', { exact: true }).waitFor();
  };
  const card = () => owner.getByLabel(/^Membro Teste: /);

  await inviteAndAccept();
  await owner.goto(`${spaceUrl}/members`, { waitUntil: 'networkidle' });
  await step('the owner sees the new member with the preset', () =>
    owner.getByLabel('Membro Teste: Colaborador', { exact: true }).waitFor(),
  );
  await owner
    .getByRole('group', { name: 'Permissões de Membro Teste' })
    .getByRole('checkbox', { name: 'categorias e tags', exact: true })
    .click();
  await step('permissions can be customized', () =>
    owner.getByLabel('Membro Teste: Acesso personalizado', { exact: true }).waitFor(),
  );
  await guest.goto(`${spaceUrl}/tags`, { waitUntil: 'networkidle' });
  await field(guest, 'Nome da tag').fill('Do membro');
  await guest.getByRole('button', { name: 'Criar tag' }).click();
  await step('the member can use the new permission', () =>
    guest.getByRole('button', { name: 'Do membro' }).filter({ visible: true }).waitFor(),
  );

  await owner.getByRole('button', { name: 'Remover Membro Teste' }).click();
  await owner.getByRole('button', { name: 'Confirmar remoção' }).click();
  await step('a removed member disappears from the list', async () => {
    await card().waitFor({ state: 'detached' });
  });
  await guest.goto(spaceUrl, { waitUntil: 'networkidle' });
  await step('a removed member loses access immediately', () =>
    guest.getByText('Espaço não encontrado ou sem acesso.').waitFor(),
  );

  await inviteAndAccept();
  await guest.goto(`${spaceUrl}/members`, { waitUntil: 'networkidle' });
  await guest.getByRole('button', { name: 'Sair do espaço' }).click();
  await guest.getByRole('button', { name: 'Confirmar saída' }).click();
  await step('a member can leave the space', async () => {
    await guest.getByRole('button', { name: 'Criar espaço' }).waitFor();
    await owner.goto(`${spaceUrl}/members`, { waitUntil: 'networkidle' });
    await owner.getByLabel(/^Dona Membros: Proprietário/).waitFor();
    if (await card().count()) {
      throw new Error('member still listed after leaving');
    }
  });
}
