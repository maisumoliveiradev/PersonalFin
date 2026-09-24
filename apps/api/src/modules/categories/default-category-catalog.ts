import type { CategoryKind } from './category.ts';

export interface DefaultCategoryDefinition {
  key: string;
  kind: CategoryKind;
  name: string;
  subcategories: readonly { key: string; name: string }[];
}

export const DEFAULT_CATEGORY_CATALOG: readonly DefaultCategoryDefinition[] = [
  {
    key: 'housing',
    kind: 'expense',
    name: 'Moradia',
    subcategories: [
      { key: 'housing.rent', name: 'Aluguel' },
      { key: 'housing.condo-fee', name: 'Condomínio' },
      { key: 'housing.utilities', name: 'Contas da casa' },
      { key: 'housing.maintenance', name: 'Manutenção' },
    ],
  },
  {
    key: 'food',
    kind: 'expense',
    name: 'Alimentação',
    subcategories: [
      { key: 'food.groceries', name: 'Supermercado' },
      { key: 'food.restaurants', name: 'Restaurantes e delivery' },
    ],
  },
  {
    key: 'transport',
    kind: 'expense',
    name: 'Transporte',
    subcategories: [
      { key: 'transport.fuel', name: 'Combustível' },
      { key: 'transport.public', name: 'Transporte público' },
      { key: 'transport.ride-hailing', name: 'Aplicativos de transporte' },
    ],
  },
  {
    key: 'health',
    kind: 'expense',
    name: 'Saúde',
    subcategories: [
      { key: 'health.insurance', name: 'Plano de saúde' },
      { key: 'health.pharmacy', name: 'Farmácia' },
    ],
  },
  { key: 'education', kind: 'expense', name: 'Educação', subcategories: [] },
  { key: 'leisure', kind: 'expense', name: 'Lazer', subcategories: [] },
  {
    key: 'services',
    kind: 'expense',
    name: 'Serviços',
    subcategories: [
      { key: 'services.subscriptions', name: 'Assinaturas' },
      { key: 'services.phone-internet', name: 'Telefone e internet' },
    ],
  },
  { key: 'other-expenses', kind: 'expense', name: 'Outros', subcategories: [] },
  {
    key: 'income',
    kind: 'income',
    name: 'Receitas',
    subcategories: [
      { key: 'income.salary', name: 'Salário' },
      { key: 'income.extra', name: 'Renda extra' },
      { key: 'income.investments', name: 'Rendimentos' },
    ],
  },
  { key: 'other-income', kind: 'income', name: 'Outras receitas', subcategories: [] },
];
