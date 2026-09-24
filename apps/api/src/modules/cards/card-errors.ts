import { AppError, NotFoundError } from '../../http/errors.ts';

export class CardNotFoundError extends NotFoundError {
  constructor() {
    super('CARD_NOT_FOUND', 'Card not found');
  }
}

export class CardNameTakenError extends AppError {
  override name = 'CardNameTakenError';

  constructor() {
    super(409, 'CARD_NAME_TAKEN', 'A card with this name already exists in this space');
  }
}
