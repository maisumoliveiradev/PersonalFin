import { AppError, NotFoundError } from '../../http/errors.ts';

export class TagNotFoundError extends NotFoundError {
  constructor() {
    super('TAG_NOT_FOUND', 'Tag not found');
  }
}

export class TagNameTakenError extends AppError {
  override name = 'TagNameTakenError';

  constructor() {
    super(409, 'TAG_NAME_TAKEN', 'A tag with this name already exists in this space');
  }
}

export class TagInUseError extends AppError {
  override name = 'TagInUseError';

  constructor() {
    super(409, 'TAG_IN_USE', 'The tag is used by transactions; archive it instead');
  }
}

export class TagNotAvailableError extends AppError {
  override name = 'TagNotAvailableError';

  constructor() {
    super(422, 'TAG_NOT_AVAILABLE', 'A tag does not exist in this space or is archived');
  }
}
