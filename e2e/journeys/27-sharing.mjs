import {
  addTransaction,
  BASE,
  field,
  newPage,
  radio,
  row,
  signUp,
  signUpWithSpace,
  uniqueEmail,
} from '../helpers.mjs';

export default async function sharingJourney({ browser, step }) {
  const owner = await newPage(browser);
  const spaceUrl = await signUpWithSpace(owner, 'Dona Casa');
  await addTransaction(owner, {
    description: 'Aluguel',
    amount: '1.500,00',
    date: '05/10/2026',
    category: 'Moradia',
  });
  const guestEmail = uniqueEmail('convidado');
  const invite = async (email, preset) => {
    await owner.goto(`${spaceUrl}/members`, { waitUntil: 'networkidle' });
    await field(owner, 'E-mail da pessoa').fill(email);
    await radio(owner, 'Acesso', preset).click();
    await owner.getByRole('button', { name: 'Criar convite' }).click();
    const link = owner.getByLabel('Link do convite');
    await link.waitFor();
    return new URL(await link.innerText()).pathname;
  };
  const viewerPath = await invite(guestEmail, 'Visualizador');
  await step('the owner sees the pending invitation', () =>
    owner
      .getByRole('button', { name: `Cancelar convite para ${guestEmail}`, exact: false })
      .waitFor(),
  );

  const guest = await newPage(browser);
  await signUp(guest, 'Convidado', guestEmail);
  await guest.getByRole('button', { name: 'Criar espaço' }).waitFor();
  await guest.goto(`${BASE}${viewerPath}`, { waitUntil: 'networkidle' });
  await step('the invited person sees what the invitation grants', async () => {
    await guest.getByText('Você foi convidado para o espaço "Pessoal".').waitFor();
    await guest.getByText('Acesso: ver.').waitFor();
  });
  await guest.getByRole('button', { name: 'Aceitar convite' }).click();
  await step('accepting opens the shared space as a member', async () => {
    await guest.getByText('Membro', { exact: true }).waitFor();
    await guest.goto(`${spaceUrl}?month=2026-10`, { waitUntil: 'networkidle' });
    await row(guest, 'Despesa', 'Aluguel').filter({ visible: true }).waitFor();
  });
  await step('a viewer cannot record', async () => {
    if (await guest.getByRole('button', { name: 'Novo lançamento' }).count()) {
      throw new Error('viewer can create transactions');
    }
    if (
      await guest
        .getByRole('button', { name: /Marcar como/ })
        .filter({ visible: true })
        .count()
    ) {
      throw new Error('viewer can change status');
    }
  });
  await guest.goto(`${BASE}${viewerPath}`, { waitUntil: 'networkidle' });
  await step('a used link cannot be reused', () =>
    guest.getByText('Este convite expirou, foi cancelado ou já foi usado.').first().waitFor(),
  );

  const otherPath = await invite(uniqueEmail('outra'), 'Colaborador');
  await guest.goto(`${BASE}${otherPath}`, { waitUntil: 'networkidle' });
  await guest.getByRole('button', { name: 'Aceitar convite' }).click();
  await step('a link for another email is refused', () =>
    guest.getByText('Este convite é para outro e-mail.', { exact: false }).waitFor(),
  );
  await field(owner, 'E-mail da pessoa').fill(guestEmail);
  await owner.getByRole('button', { name: 'Criar convite' }).click();
  await step('someone who already has access cannot be invited again', () =>
    owner.getByText('Essa pessoa já tem acesso ao espaço.').waitFor(),
  );
}
