import { AppError, NotFoundError } from '../../http/errors.ts';

export class DebtNotFoundError extends NotFoundError {
  constructor() {
    super('DEBT_NOT_FOUND', 'Debt not found');
  }
}

export class DebtPaymentNotFoundError extends NotFoundError {
  constructor() {
    super('DEBT_PAYMENT_NOT_FOUND', 'Debt payment not found');
  }
}

export class DebtOverpaymentError extends AppError {
  override name = 'DebtOverpaymentError';

  constructor() {
    super(422, 'DEBT_OVERPAYMENT', 'The payment is larger than the outstanding balance');
  }
}

export class InvalidDebtPlanError extends AppError {
  override name = 'InvalidDebtPlanError';

  constructor(message: string) {
    super(422, 'INVALID_DEBT_PLAN', message);
  }
}
