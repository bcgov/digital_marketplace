import { ORIGIN } from 'back-end/config';
import { prefix } from 'shared/lib';
import uuid from 'uuid/v4';

export function generateUuid(): string {
  return uuid();
}

export function prefixPath(path: string): string {
  return prefix(ORIGIN)(path);
}
