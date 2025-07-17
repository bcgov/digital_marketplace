import { DEFAULT_USER_AVATAR_IMAGE_PATH } from "front-end/config";
import { fileBlobPath } from "front-end/lib";
import { ThemeColor } from "front-end/lib/types";
import {
  GOV_IDP_NAME,
  GOV_IDP_SUFFIX,
  VENDOR_IDP_NAME,
  VENDOR_IDP_SUFFIX
} from "shared/config";
import {
  KeyCloakIdentityProvider,
  User,
  UserStatus,
  UserType,
  userTypeToKeycloakIdentityProvider
} from "shared/lib/resources/user";

export function userAvatarPath(user?: Pick<User, "avatarImageFile">): string {
  return user && user.avatarImageFile
    ? fileBlobPath(user.avatarImageFile)
    : DEFAULT_USER_AVATAR_IMAGE_PATH;
}

export function keyCloakIdentityProviderToTitleCase(
  v: KeyCloakIdentityProvider
): string | null {
  if (v === VENDOR_IDP_SUFFIX) {
    return VENDOR_IDP_NAME;
  } else if (v === GOV_IDP_SUFFIX) {
    return GOV_IDP_NAME;
  } else {
    return null;
  }
}

export function userToKeyCloakIdentityProviderTitleCase(
  user: User
): string | null {
  return keyCloakIdentityProviderToTitleCase(
    userTypeToKeycloakIdentityProvider(user.type)
  );
}

export function userTypeToPermissions(v: UserType): string[] {
  switch (v) {
    case UserType.Admin:
      return ["Admin"];
    case UserType.Government:
    case UserType.Vendor:
      return [];
  }
}

export function userStatusToTitleCase(v: UserStatus): string {
  switch (v) {
    case UserStatus.InactiveByAdmin:
    case UserStatus.InactiveByUser:
      return "Inactive";
    case UserStatus.Active:
      return "Active";
  }
}

export function userStatusToColor(v: UserStatus): ThemeColor {
  switch (v) {
    case UserStatus.InactiveByAdmin:
    case UserStatus.InactiveByUser:
      return "danger";
    case UserStatus.Active:
      return "success";
  }
}
