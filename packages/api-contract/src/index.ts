import type { components } from './generated/schema.ts';

export type { components, operations, paths } from './generated/schema.ts';

export type HealthStatus = components['schemas']['HealthStatus'];
export type CurrentUser = components['schemas']['CurrentUser'];
export type ErrorResponse = components['schemas']['ErrorResponse'];
export type CreateFinancialSpaceRequest = components['schemas']['CreateFinancialSpaceRequest'];
export type FinancialSpace = components['schemas']['FinancialSpace'];
export type FinancialSpaceList = components['schemas']['FinancialSpaceList'];
export type CategoryKind = components['schemas']['CategoryKind'];
export type CategoryTreeItem = components['schemas']['CategoryTreeItem'];
export type CategoryList = components['schemas']['CategoryList'];
export type TransactionType = components['schemas']['TransactionType'];
export type TransactionStatus = components['schemas']['TransactionStatus'];
export type CreateTransactionRequest = components['schemas']['CreateTransactionRequest'];
export type Transaction = components['schemas']['Transaction'];
export type TransactionList = components['schemas']['TransactionList'];
export type UpdateTransactionRequest = components['schemas']['UpdateTransactionRequest'];
export type Category = components['schemas']['Category'];
export type CreateCategoryRequest = components['schemas']['CreateCategoryRequest'];
export type UpdateCategoryRequest = components['schemas']['UpdateCategoryRequest'];
