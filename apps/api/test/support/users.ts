import type { AuthenticatedUser } from '../../src/auth/authenticated-user.ts';

export const ana: AuthenticatedUser = {
  id: '0f8fad5b-d9cb-469f-a165-70867728950e',
  email: 'ana@example.com',
  name: 'Ana',
};

export const bruno: AuthenticatedUser = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  email: 'bruno@example.com',
  name: 'Bruno',
};

export const sessions = { 'ana-token': ana, 'bruno-token': bruno };
