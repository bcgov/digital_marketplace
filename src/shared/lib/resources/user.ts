import { PublicFile } from 'shared/lib/resources/file';
import { Id } from 'shared/lib/types';
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

export function getAllUsers(): User[] {
  return [
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
  ];
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

export function viewStringFor(type: UserType): string {
  switch (type) {
      case UserType.Government:
      case UserType.Admin:
        return 'Public Sector Employee';
      case UserType.Vendor:
        return 'Vendor';
  }
}
