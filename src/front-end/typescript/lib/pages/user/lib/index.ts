import { DEFAULT_USER_AVATAR_IMAGE_PATH } from 'front-end/config';
import { fileBlobPath } from 'front-end/lib';
import { ThemeColor } from 'front-end/lib/types';
import { KeyCloakIdentityProvider, User, UserStatus, UserType, userTypeToKeycloakIdentityProvider } from 'shared/lib/resources/user';

export function userAvatarPath(user?: Pick<User, 'avatarImageFile'>): string {
  return user && user.avatarImageFile
    ? fileBlobPath(user.avatarImageFile)
    : DEFAULT_USER_AVATAR_IMAGE_PATH;
}

export function keyCloakIdentityProviderToTitleCase(v: KeyCloakIdentityProvider): string {
  switch (v) {
    case 'github': return 'GitHub';
    case 'idir': return 'IDIR';
  }
}

export function userToKeyClockIdentityProviderTitleCase(user: User): string {
  return keyCloakIdentityProviderToTitleCase(userTypeToKeycloakIdentityProvider(user.type));
}

export function userTypeToTitleCase(v: UserType): string {
  switch (v) {
      case UserType.Government:
      case UserType.Admin:
        return 'Public Sector Employee';
      case UserType.Vendor:
        return 'Vendor';
  }
}

export function userTypeToPermissions(v: UserType): string[] {
  switch (v) {
      case UserType.Admin:
        return ['Admin'];
      case UserType.Government:
      case UserType.Vendor:
        return [];
  }
}

export function userStatusToTitleCase(v: UserStatus): string {
  switch (v) {
      case UserStatus.InactiveByAdmin:
      case UserStatus.InactiveByUser:
        return 'Inactive';
      case UserStatus.Active:
        return 'Active';
  }
}

export function userStatusToColor(v: UserStatus): ThemeColor {
  switch (v) {
      case UserStatus.InactiveByAdmin:
      case UserStatus.InactiveByUser:
        return 'danger';
      case UserStatus.Active:
        return 'success';
  }
}
