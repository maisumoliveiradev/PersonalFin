import { API, newPage, signUpWithSpace } from '../helpers.mjs';

export default async function clientVersionJourney({ browser, step }) {
  const page = await newPage(browser);
  const sentVersions = new Set();
  page.on('request', (request) => {
    if (request.url().startsWith(`${API}/financial-spaces`)) {
      sentVersions.add(request.headers()['x-client-version']);
    }
  });
  const spaceUrl = await signUpWithSpace(page, 'Versao Teste');

  await step('every API call sends the app version', async () => {
    if (sentVersions.size !== 1 || !/^\d+\.\d+\.\d+$/.test([...sentVersions][0] ?? '')) {
      throw new Error(`versions sent: ${[...sentVersions].join(', ')}`);
    }
  });

  await page.route(`${API}/financial-spaces/**`, (route) =>
    route.fulfill({
      status: 426,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'CLIENT_UPGRADE_REQUIRED', message: 'Update the app' },
      }),
    }),
  );
  await page.goto(spaceUrl);

  await step('an unsupported version shows the update screen', async () => {
    await page.getByText('Atualize o PersonalFin').waitFor();
    await page.getByText(/Versão instalada: \d+\.\d+\.\d+/).waitFor();
  });

  await page.unroute(`${API}/financial-spaces/**`);
  await page.getByRole('button', { name: 'Tentar novamente' }).click();

  await step('retrying after the server accepts the version restores the app', async () => {
    await page.getByText('Seus espaços financeiros').waitFor();
  });
}
