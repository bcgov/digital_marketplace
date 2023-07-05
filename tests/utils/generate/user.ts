import { faker } from "@faker-js/faker";
import { omit } from "lodash";
import { User, UserType, UserStatus } from "shared/lib/resources/user";
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
    capabilities: CAPABILITY_NAMES_ONLY,
    idpId: idpUsername,
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

export { buildUser, buildCreateUserParams };
