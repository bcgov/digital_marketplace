import { Connection, readOneUser } from 'back-end/lib/db';
import { hashPassword } from 'back-end/lib/security';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { invalid, valid, validatePassword as validatePasswordShared, Validation } from 'shared/lib/validators';

export async function validatePassword(password: string): Promise<Validation<string>> {
  const validation = validatePasswordShared(password);
  switch (validation.tag) {
    case 'invalid':
      return validation;
    case 'valid':
      return valid(await hashPassword(validation.value));
  }
}

export async function validateUserId(connection: Connection, userId: Id): Promise<Validation<User>> {
  try {
    const user = await readOneUser(connection, userId);
    if (user) {
      return valid(user);
    } else {
      return invalid(['This user cannot be found.']);
    }
  } catch (e) {
    return invalid(['Please select a valid user.']);
  }
}
