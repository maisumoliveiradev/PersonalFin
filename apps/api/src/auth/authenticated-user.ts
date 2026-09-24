export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface SessionResolver {
  resolve(headers: Headers): Promise<AuthenticatedUser | null>;
}
