import { GOV_IDP_SUFFIX, VENDOR_IDP_SUFFIX } from "shared/config";
import { FileRecord } from "shared/lib/resources/file";
import { ADT, BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export const VIEWER_USER_ROUTE_PARAM = "me";

export type KeyCloakIdentityProvider = string;

export enum UserType {
  Vendor = "VENDOR",
  Government = "GOV",
  Admin = "ADMIN"
}

export function userTypeToKeycloakIdentityProvider(
  userType: UserType
): KeyCloakIdentityProvider {
  switch (userType) {
    case UserType.Vendor:
      return VENDOR_IDP_SUFFIX;
    case UserType.Government:
    case UserType.Admin:
      return GOV_IDP_SUFFIX;
  }
}

export function userTypeToTitleCase(v: UserType): string {
  switch (v) {
    case UserType.Government:
    case UserType.Admin:
      return "Public Sector Employee";
    case UserType.Vendor:
      return "Vendor";
  }
}

export function gitHubProfileLink(username: string): string {
  return `https://github.com/${username}`;
}

export enum UserStatus {
  Active = "ACTIVE",
  InactiveByUser = "INACTIVE_USER",
  InactiveByAdmin = "INACTIVE_ADMIN"
}

export interface User {
  id: Id;
  type: UserType;
  status: UserStatus;
  name: string;
  email: string | null;
  jobTitle: string;
  avatarImageFile: FileRecord | null;
  notificationsOn: Date | null;
  acceptedTermsAt: Date | null;
  lastAcceptedTermsAt: Date | null;
  idpUsername: string;
  deactivatedOn: Date | null;
  deactivatedBy: Id | null;
  capabilities: string[];
  idpId: string;
}

export type UserSlim = Pick<User, "id" | "name" | "avatarImageFile">;

export function userToUserSlim(u: User): UserSlim {
  return {
    id: u.id,
    name: u.name,
    avatarImageFile: u.avatarImageFile ?? null
  };
}

export function usersAreEquivalent<T extends User | UserSlim>(
  a: T,
  b: T
): boolean {
  return a.id === b.id;
}

export function isAdmin(user: Pick<User, "type">): boolean {
  return user.type === UserType.Admin;
}

export function isGovernment(user: Pick<User, "type">): boolean {
  return user.type === UserType.Government;
}

export function isPublicSectorEmployee(user: Pick<User, "type">): boolean {
  return isAdmin(user) || isGovernment(user);
}

export function isVendor(user: Pick<User, "type">): boolean {
  return user.type === UserType.Vendor;
}

export function isPublicSectorUserType(userType: UserType): boolean {
  return isPublicSectorEmployee({ type: userType });
}

export function mustAcceptTerms(user: Pick<User, "type">): boolean {
  return isVendor(user);
}

export function usersHaveCapability(
  users: Array<Pick<User, "capabilities">>,
  capability: string
): boolean {
  for (const u of users) {
    if (u.capabilities.indexOf(capability) !== -1) {
      return true;
    }
  }
  return false;
}

export interface UpdateProfileRequestBody {
  name: string;
  email: string;
  jobTitle: string;
  avatarImageFile?: Id;
}

export type UpdateRequestBody =
  | ADT<"updateProfile", UpdateProfileRequestBody>
  | ADT<"updateCapabilities", string[]>
  | ADT<"acceptTerms">
  | ADT<"updateNotifications", boolean>
  | ADT<"reactivateUser">
  | ADT<"updateAdminPermissions", boolean>;

export type UpdateProfileValidationErrors =
  ErrorTypeFrom<UpdateProfileRequestBody>;

type UpdateADTErrors =
  | ADT<"updateProfile", UpdateProfileValidationErrors>
  | ADT<"updateCapabilities", string[][]>
  | ADT<"acceptTerms", string[]>
  | ADT<"updateNotifications", string[]>
  | ADT<"updateAdminPermissions", string[]>
  | ADT<"parseFailure">;

export interface UpdateValidationErrors extends BodyWithErrors {
  user?: UpdateADTErrors;
}

export interface DeleteValidationErrors extends BodyWithErrors {
  user?: string[];
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

export function adminPermissionsToUserType(admin: boolean): UserType {
  return admin ? UserType.Admin : UserType.Government;
}

export function notificationsBooleanToNotificationsOn(
  notificationsOn: boolean
): Date | null {
  return notificationsOn ? new Date() : null;
}
