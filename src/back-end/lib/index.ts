import uuid from 'uuid/v4';

export function generateUuid(): string {
  return uuid();
}
