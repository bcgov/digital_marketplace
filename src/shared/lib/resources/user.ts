import { request } from 'shared/lib/http';
import { PublicFile } from 'shared/lib/resources/file';
import { Id } from 'shared/lib/types';
import { ClientHttpMethod } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export enum UserType {
  Vendor = 'VENDOR',
  Government = 'GOV',
  Admin = 'ADMIN'
}

export enum UserStatus {
  Active = 'ACTIVE',
  InactiveByUser = 'INACTIVE_USER',
  InactiveByAdmin = 'INACTIVE_ADMIN'
}

export interface User {
  id: Id;
  type: UserType;
  status: UserStatus;
  name: string;
  email?: string;
  avatarImageFile?: PublicFile;
  notificationsOn: boolean;
  acceptedTerms: boolean;
  idpUsername: string;
}

export interface UpdateRequestBody {
  id: Id;
  status?: UserStatus;
  name?: string;
  email?: string;
  avatarImageFile?: Id;
  notificationsOn?: boolean;
  acceptedTerms?: boolean;
}

export type UpdateValidationErrors = ErrorTypeFrom<UpdateRequestBody>;

export async function updateUser(user: UpdateRequestBody): Promise<Validation<User, null>> {
  const response = await request(ClientHttpMethod.Put, 'api/users', user);
  switch (response.status) {
    case 200:
      return valid(response.data as User); // TODO(Jesse): Does this actually pass the result back?
    default:
      return invalid(null);
  }
}

export async function readOneUser(id: string): Promise<User> {
  const users: User[] = await readAllUsers();
  return users[0];
}

export async function readAllUsers(): Promise<User[]> {
  return new Promise( (resolve) => {
    return resolve([
      {
        id: '1',
        type: UserType.Government,
        status: UserStatus.Active,
        name: 'John Doe',
        notificationsOn: true,
        acceptedTerms: true,
        idpUsername: 'john_doe'
      },
      {
        id: '2',
        type: UserType.Vendor,
        status: UserStatus.Active,
        name: 'John Blow',
        notificationsOn: true,
        acceptedTerms: true,
        idpUsername: 'john_blow'
      },
      {
        id: '3',
        type: UserType.Vendor,
        status: UserStatus.InactiveByAdmin,
        name: 'Miss Wiss',
        notificationsOn: true,
        acceptedTerms: true,
        idpUsername: 'miss_wiss'
      },
      {
        id: '4',
        type: UserType.Government,
        status: UserStatus.InactiveByUser,
        name: 'Tina Turner',
        notificationsOn: true,
        acceptedTerms: true,
        idpUsername: 'tina_turner'
      },
      {
        id: '5',
        type: UserType.Admin,
        status: UserStatus.InactiveByUser,
        name: 'Biggie Smalls',
        notificationsOn: true,
        acceptedTerms: true,
        idpUsername: 'biggie'
      }
    ]);
  });
}

export function parseUserStatus(raw: string): UserStatus | null {
  switch (raw) {
    case UserStatus.Active:
      return UserStatus.Active;
    case UserStatus.InactiveByUser:
      return UserStatus.InactiveByUser;
    case UserStatus.InactiveByAdmin:
      return UserStatus.InactiveByAdmin;
    default:
      return null;
  }
}

export function parseUserType(raw: string): UserType | null {
  switch (raw) {
    case UserType.Vendor:
      return UserType.Vendor;
    case UserType.Government:
      return UserType.Government;
    case UserType.Admin:
      return UserType.Admin;
    default:
      return null;
  }
}
