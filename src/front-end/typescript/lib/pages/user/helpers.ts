import { User, UserStatus, UserType } from 'shared/lib/resources/user';
import * as UserModule from 'shared/lib/resources/user';

export function isPublic(user: User | undefined): boolean {
  const result = (user !== undefined) && (user.type === UserType.Government || user.type === UserType.Admin);
  return result;
}

type DisplayUserType = 'Public Sector Employee' | 'Vendor';

export interface DisplayUser {
  name: string;
  type: DisplayUserType;
  active: boolean;
  admin: boolean;
}

export function getBadgeColor(isActive: boolean): string {
  return isActive ? 'badge-success' : 'badge-danger';
}

export function toDisplayUser(user: UserModule.User): DisplayUser {
  return ({
    name: user.name,
    type: user.type === UserModule.UserType.Vendor ? 'Vendor' : 'Public Sector Employee',
    admin: user.type === UserModule.UserType.Admin ? true : false,
    active: user.status === UserModule.UserStatus.Active ? true : false
  });
}

export function viewStringForUserStatus(type: UserStatus): string {
  switch (type) {
      case UserStatus.InactiveByAdmin:
      case UserStatus.InactiveByUser:
        return 'Inactive';
      case UserStatus.Active:
        return 'Active';
  }
}

export function viewStringForUserType(type: UserType): string {
  switch (type) {
      case UserType.Government:
      case UserType.Admin:
        return 'Public Sector Employee';
      case UserType.Vendor:
        return 'Vendor';
  }
}
