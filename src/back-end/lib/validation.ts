import { Connection, readOneUser } from 'back-end/lib/db';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

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
