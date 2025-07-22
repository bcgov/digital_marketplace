import { generateUuid } from "back-end/lib";
import { Connection, tryDb } from "back-end/lib/db";
import { readOneFileById } from "back-end/lib/db/file";
import { makeDomainLogger } from "back-end/lib/logger";
import { console as consoleAdapter } from "back-end/lib/logger/adapters";
import { valid } from "shared/lib/http";
import { MembershipStatus } from "shared/lib/resources/affiliation";
import {
  User,
  UserSlim,
  UserStatus,
  UserType
} from "shared/lib/resources/user";
import { Id } from "shared/lib/types";
import { getValidValue } from "shared/lib/validation";

export type CreateUserParams = Omit<Partial<User>, "avatarImageFile"> & {
  createdAt?: Date;
  updatedAt?: Date;
  avatarImageFile?: Id;
};

export type UpdateUserParams = Omit<Partial<User>, "avatarImageFile"> & {
  updatedAt?: Date;
  avatarImageFile?: Id;
};

export interface RawUser extends Omit<User, "avatarImageFile"> {
  avatarImageFile: Id | null;
}

export interface RawUserSlim extends Omit<UserSlim, "avatarImageFile"> {
  avatarImageFile?: Id;
}

export async function rawUserToUser(
  connection: Connection,
  params: RawUser
): Promise<User> {
  const { avatarImageFile: fileId, ...restOfRawUser } = params;
  const avatarImageFile = fileId
    ? getValidValue(await readOneFileById(connection, fileId), null)
    : null;
  return {
    ...restOfRawUser,
    avatarImageFile
  };
}

export async function rawUserSlimToUserSlim(
  connection: Connection,
  params: RawUserSlim
): Promise<UserSlim> {
  const { avatarImageFile: fileId, ...restOfRawUser } = params;
  const avatarImageFile = fileId
    ? getValidValue(await readOneFileById(connection, fileId), null)
    : null;
  return {
    ...restOfRawUser,
    avatarImageFile: avatarImageFile ?? null
  };
}

export const readOneUser = tryDb<[Id], User | null>(async (connection, id) => {
  const result = await connection<RawUser>("users")
    .select(
      "id",
      "type",
      "status",
      "name",
      "email",
      "jobTitle",
      "avatarImageFile",
      "notificationsOn",
      "acceptedTermsAt",
      "lastAcceptedTermsAt",
      "idpUsername",
      "idpId",
      "deactivatedOn",
      "deactivatedBy",
      "capabilities"
    )
    .where({ id })
    .first();
  return valid(result ? await rawUserToUser(connection, result) : null);
});

export const readOneUserSlim = tryDb<[Id], UserSlim | null>(
  async (connection, id) => {
    const result = await connection<UserSlim>("users")
      .where({ id })
      .select("id", "name", "avatarImageFile")
      .first();
    return valid(result ? result : null);
  }
);

export const readOneUserByEmail = tryDb<
  [string, boolean?, UserType[]?],
  User | null
>(async (connection, email, allowInactive = false, userTypes) => {
  const where = {
    email,
    status: allowInactive ? "*" : UserStatus.Active
  };
  const query = connection("users").where(where).first();
  const result: RawUser = await (userTypes
    ? query.whereIn("type", userTypes)
    : query);
  return valid(result ? await rawUserToUser(connection, result) : null);
});

export const findOneUserByTypeAndUsername = tryDb<
  [UserType, string],
  User | null
>(async (connection, userType, idpUsername) => {
  const query = connection<User>("users")
    .where({ type: userType, idpUsername })
    // Support querying admin statuses even if the desired user could be a vendor.
    // This is useful for development purposes.
    .orWhere({ type: UserType.Admin, idpUsername });
  const result = await query.first();
  return valid(result ? result : null);
});

export const findOneUserByTypeAndIdp = tryDb<[UserType, string], User | null>(
  async (connection, type, idpId) => {
    const result = await connection<User>("users")
      .where({ idpId, type })
      .first()
      .orWhere({ type: UserType.Admin, idpId });
    return valid(result ? result : null);
  }
);

export const readManyUsers = tryDb<[], User[]>(async (connection) => {
  const results = await connection<RawUser>("users").select(
    "id",
    "type",
    "status",
    "name",
    "email",
    "jobTitle",
    "avatarImageFile",
    "notificationsOn",
    "acceptedTermsAt",
    "lastAcceptedTermsAt",
    "idpUsername",
    "idpId",
    "deactivatedOn",
    "deactivatedBy",
    "capabilities"
  );
  return valid(
    await Promise.all(
      results.map(async (raw) => await rawUserToUser(connection, raw))
    )
  );
});

export const readManyUsersNotificationsOn = tryDb<[], User[]>(
  async (connection) => {
    const results = await connection<RawUser>("users")
      .whereNotNull("notificationsOn")
      .whereNull("deactivatedOn")
      .select("*");
    return valid(
      await Promise.all(
        results.map(async (raw) => await rawUserToUser(connection, raw))
      )
    );
  }
);

export const readManyUsersByRole = tryDb<[UserType, boolean?], User[]>(
  async (connection, type, includeInactive = true) => {
    const query = connection<RawUser>("users").where({ type }).select("*");

    if (!includeInactive) {
      query.where({ status: UserStatus.Active });
    }

    const results = await query;
    return valid(
      await Promise.all(
        results.map(async (raw) => await rawUserToUser(connection, raw))
      )
    );
  }
);

export const readManyUsersWithOrganizations = tryDb<
  [UserType[], boolean?],
  Array<{ user: User; organizationNames: string[] }>
>(async (connection, userTypes, includeInactive = true) => {
  // Single query with LEFT JOIN to get users and all their organizations
  const results = await connection("users")
    .leftJoin("affiliations", "users.id", "=", "affiliations.user")
    .leftJoin(
      "organizations",
      "affiliations.organization",
      "=",
      "organizations.id"
    )
    .whereIn("users.type", userTypes)
    .andWhere(function () {
      if (!includeInactive) {
        this.where({ "users.status": UserStatus.Active });
      }
    })
    .andWhere(function () {
      // Only include active affiliations and organizations, or users without affiliations
      this.whereNull("affiliations.id").orWhere(function () {
        this.where({
          "organizations.active": true
        }).andWhereNot({
          "affiliations.membershipStatus": MembershipStatus.Inactive
        });
      });
    })
    .select("users.*", "organizations.legalName as organizationName")
    .orderBy("affiliations.createdAt", "desc"); // Order by newest affiliations first

  // Process results to group by user and collect all organizations
  const userMap = new Map<
    string,
    { user: RawUser; organizationNames: Set<string> }
  >();

  for (const result of results) {
    const userId = result.id;
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        user: result,
        organizationNames: new Set<string>()
      });
    }

    // Add organization name if it exists
    if (result.organizationName) {
      userMap.get(userId)!.organizationNames.add(result.organizationName);
    }
  }

  // Convert to User objects
  const processedResults = await Promise.all(
    Array.from(userMap.values()).map(async ({ user, organizationNames }) => ({
      user: await rawUserToUser(connection, user),
      organizationNames: Array.from(organizationNames)
    }))
  );

  return valid(processedResults);
});

const tempLogger = makeDomainLogger(consoleAdapter, "create-user-debug");
export const createUser = tryDb<[CreateUserParams], User>(
  async (connection, user) => {
    const now = new Date();
    try {
      const [result] = await connection<RawUser>("users").insert(
        {
          ...user,
          id: generateUuid(),
          createdAt: now,
          updatedAt: now
        } as CreateUserParams,
        [
          "id",
          "type",
          "status",
          "name",
          "email",
          "jobTitle",
          "avatarImageFile",
          "notificationsOn",
          "acceptedTermsAt",
          "lastAcceptedTermsAt",
          "idpUsername",
          "idpId",
          "deactivatedOn",
          "deactivatedBy",
          "capabilities"
        ]
      );
      if (!result) {
        throw new Error("unable to create user");
      }
      return valid(await rawUserToUser(connection, result));
    } catch (e) {
      const err = new Error("user creation failed");
      tempLogger.error(
        `user creation failed with; email: ${user.email}; type: ${user.type}`
      );
      tempLogger.error(err.stack || "error stack");
      throw e;
    }
  }
);

export const updateUser = tryDb<[UpdateUserParams], User>(
  async (connection, user) => {
    const now = new Date();
    const [result] = await connection<RawUser>("users")
      .where({ id: user && user.id })
      .update(
        {
          ...user,
          updatedAt: now
        } as UpdateUserParams,
        "*"
      );
    if (!result) {
      throw new Error("unable to update user");
    }
    return valid(await rawUserToUser(connection, result));
  }
);

export async function unacceptTermsForAllVendors(
  connection: Connection
): Promise<number> {
  const results = await connection<RawUser>("users")
    .where({ type: UserType.Vendor })
    .update(
      {
        acceptedTermsAt: null
      },
      "*"
    );

  if (!results) {
    throw new Error("unable to update users");
  }

  return results.length;
}

export async function userHasAcceptedCurrentTerms(
  connection: Connection,
  id: Id
): Promise<boolean> {
  const [result] = await connection<{ acceptedTermsAt: Date }>("users")
    .where("id", id)
    .select("acceptedTermsAt");

  if (!result) {
    throw new Error("unable to check current terms status for user");
  }
  if (result.acceptedTermsAt) {
    return true;
  }
  return false;
}

export async function userHasAcceptedPreviousTerms(
  connection: Connection,
  id: Id
): Promise<boolean> {
  const [result] = await connection<{ lastAcceptedTermsAt: Date }>("users")
    .where("id", id)
    .select("lastAcceptedTermsAt");

  if (!result) {
    throw new Error("unable to check previous terms status for user");
  }
  if (result.lastAcceptedTermsAt) {
    return true;
  }
  return false;
}
