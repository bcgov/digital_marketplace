import { faker } from "@faker-js/faker";
import { omit, pick } from "lodash";
import {
  User,
  UserType,
  UserStatus,
  UserSlim
} from "shared/lib/resources/user";
import {
  getEmail,
  getId,
  getDisplayName,
  getUserName
} from "tests/utils/generate";
import CAPABILITY_NAMES_ONLY from "shared/lib/data/capabilities";
import { CreateUserParams } from "back-end/lib/db/user";

function buildUser(overrides: Partial<User> = {}): User {
  const acceptedTermsAt = faker.date.recent();
  const idpUsername = getUserName();

  return {
    id: getId(),
    type: UserType.Government,
    status: UserStatus.Active,
    name: getDisplayName(),
    email: getEmail(),
    jobTitle: faker.lorem.sentence(),
    avatarImageFile: null,
    notificationsOn: null,
    acceptedTermsAt,
    lastAcceptedTermsAt: acceptedTermsAt,
    idpUsername,
    deactivatedOn: null,
    deactivatedBy: null,
    capabilities: faker.helpers.arrayElements(CAPABILITY_NAMES_ONLY),
    idpId: idpUsername,
    ...overrides
  };
}

function buildUserSlim(overrides: Partial<UserSlim> = {}): UserSlim {
  return {
    ...pick(buildUser(), ["id", "name", "avatarImageFile"]),
    ...overrides
  };
}

function buildCreateUserParams(
  overrides: Partial<CreateUserParams> = {}
): CreateUserParams {
  return {
    ...omit(buildUser(), ["avatarImageFile"]),
    ...overrides
  };
}

export { buildUser, buildUserSlim, buildCreateUserParams };
