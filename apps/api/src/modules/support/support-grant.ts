import { AppError, NotFoundError } from '../../http/errors.ts';

export const MAX_SUPPORT_GRANT_DAYS = 7;

export interface SupportGrant {
  id: string;
  financialSpaceId: string;
  spaceName: string;
  grantedByUserId: string;
  adminUserId: string;
  adminName: string;
  adminEmail: string;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  lastAccessAt: Date | null;
  accessCount: number;
}

export interface SupportGrantRepository {
  findAdminByEmail(email: string): Promise<{ id: string } | null>;
  create(grant: {
    id: string;
    financialSpaceId: string;
    grantedByUserId: string;
    adminUserId: string;
    reason: string;
    expiresAt: Date;
  }): Promise<SupportGrant>;
  listForSpace(financialSpaceId: string): Promise<SupportGrant[]>;
  listActiveForAdmin(adminUserId: string): Promise<SupportGrant[]>;
  revoke(
    financialSpaceId: string,
    grantId: string,
    actorUserId: string,
  ): Promise<SupportGrant | null>;
}

export class SupportGrantNotFoundError extends NotFoundError {
  constructor() {
    super('SUPPORT_GRANT_NOT_FOUND', 'Support grant not found');
  }
}

export class SupportAdminNotFoundError extends AppError {
  override name = 'SupportAdminNotFoundError';

  constructor() {
    super(422, 'SUPPORT_ADMIN_NOT_FOUND', 'No platform administrator uses this email');
  }
}

export class OwnerOnlyError extends AppError {
  override name = 'OwnerOnlyError';

  constructor() {
    super(403, 'PERMISSION_DENIED', 'Only the Owner can manage support access');
  }
}
