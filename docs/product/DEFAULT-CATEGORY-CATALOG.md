# DEFAULT-CATEGORY-CATALOG.md

Default categories every new Financial Space receives exactly once, at
creation (FR-027, FR-028, SDD-004). Source of truth in code:
`apps/api/src/modules/categories/default-category-catalog.ts`.

Names are stored in pt-BR as regular space data (owner decision). Each
entry has a stable `key` so the catalog can be recognized later (for
example for localization or analytics) even if the user renames it.

## Expense categories

| Key | Category | Subcategories |
|---|---|---|
| `housing` | Moradia | Aluguel, Condomínio, Contas da casa, Manutenção |
| `food` | Alimentação | Supermercado, Restaurantes e delivery |
| `transport` | Transporte | Combustível, Transporte público, Aplicativos de transporte |
| `health` | Saúde | Plano de saúde, Farmácia |
| `education` | Educação | --- |
| `leisure` | Lazer | --- |
| `services` | Serviços | Assinaturas, Telefone e internet |
| `other-expenses` | Outros | --- |

## Income categories

| Key | Category | Subcategories |
|---|---|---|
| `income` | Receitas | Salário, Renda extra, Rendimentos |
| `other-income` | Outras receitas | --- |

## Seeding rules

-   Seeding runs in the same database transaction that creates the
    space; if seeding fails, the space is not created.
-   `financial_space.default_categories_seeded_at` records that seeding
    happened. Seeding again (including concurrent attempts) adds nothing.
-   Changing this catalog affects only spaces created afterwards.
