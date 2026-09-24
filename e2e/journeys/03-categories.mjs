import { newPage, signUpWithSpace } from '../helpers.mjs';

export default async function categoriesJourney({ browser, step }) {
  const page = await newPage(browser);
  await signUpWithSpace(page, 'Cat Teste');
  await page.getByRole('button', { name: 'Gerenciar categorias' }).click();
  await step('categories screen lists the default catalog', () =>
    page.getByRole('heading', { name: 'Categorias' }).waitFor(),
  );
  await step('Moradia shows its subcategories', () =>
    page.getByText('Aluguel · Condomínio · Contas da casa · Manutenção').waitFor(),
  );
  await step('Receitas shows Salário', () =>
    page.getByText('Salário · Renda extra · Rendimentos').waitFor(),
  );
}
