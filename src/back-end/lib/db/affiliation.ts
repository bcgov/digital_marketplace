import { generateUuid } from "back-end/lib";
import { Connection, tryDb } from "back-end/lib/db";
import {
  readOneOrganization,
  readOneOrganizationSlim
} from "back-end/lib/db/organization";
import { readOneUser } from "back-end/lib/db/user";
import { valid } from "shared/lib/http";
import {
  Affiliation,
  AffiliationEvent,
  AffiliationHistoryRecord,
  AffiliationMember,
  AffiliationSlim,
  MembershipStatus,
  MembershipType
} from "shared/lib/resources/affiliation";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { User } from "shared/lib/resources/user";
import { Id } from "shared/lib/types";
import { getValidValue } from "shared/lib/validation";

export type CreateAffiliationParams = Partial<
  Omit<Affiliation, "user" | "organization">
> & { user: Id; organization: Id };

interface RawAffiliation {
  id: Id;
  user: Id;
  organization: Id;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

type OrgIds = Record<"organization", Id>[];

export interface RawHistoryRecord
  extends Omit<AffiliationHistoryRecord, "createdBy" | "member" | "type"> {
  id: Id;
  createdBy: Id;
  event: AffiliationEvent;
  affiliation: Id;
}

async function rawAffiliationToAffiliation(
  connection: Connection,
  params: RawAffiliation
): Promise<Affiliation> {
  const { user: userId, organization: orgId } = params;
  const organization = getValidValue(
    await readOneOrganization(connection, orgId, false),
    null
  );
  const user = getValidValue(await readOneUser(connection, userId), null);
  if (!user || !organization) {
    throw new Error("unable to process affiliation"); // Will be caught by calling function
  }
  return {
    ...params,
    user,
    organization
  };
}

async function rawAffiliationToAffiliationSlim(
  connection: Connection,
  params: RawAffiliation,
  session?: Session
): Promise<AffiliationSlim> {
  const { id, organization: orgId, membershipType, membershipStatus } = params;
  const organization = getValidValue(
    await readOneOrganizationSlim(connection, orgId, false, session),
    null
  );
  if (!organization) {
    throw new Error("unable to process affiliation"); // Will be caught by calling function
  }
  return {
    id,
    membershipType,
    membershipStatus,
    organization
  };
}

async function rawAffiliationToAffiliationMember(
  connection: Connection,
  params: RawAffiliation
): Promise<AffiliationMember> {
  const { id, user: userId, membershipType, membershipStatus } = params;
  const user = getValidValue(await readOneUser(connection, userId), null);
  if (!user) {
    throw new Error("unable to process affiliation");
  }
  return {
    id,
    membershipType,
    membershipStatus,
    user: {
      id: user.id,
      name: user.name,
      avatarImageFile: user.avatarImageFile,
      capabilities: user.capabilities
    }
  };
}

export const readOneAffiliation = tryDb<[Id, Id], Affiliation | null>(
  async (connection, user, organization) => {
    const result = await connection<RawAffiliation>("affiliations")
      .join(
        "organizations",
        "affiliations.organization",
        "=",
        "organizations.id"
      )
      .select<RawAffiliation>("affiliations.*")
      .where({
        "affiliations.user": user,
        "affiliations.organization": organization
      })
      .andWhereNot({
        "affiliations.membershipStatus": MembershipStatus.Inactive,
        "organizations.active": false
      })
      .orderBy("createdAt")
      .first();

    return valid(
      result ? await rawAffiliationToAffiliation(connection, result) : null
    );
  }
);

export const readOneAffiliationById = tryDb<[Id], Affiliation | null>(
  async (connection, id) => {
    const result = await connection<RawAffiliation>("affiliations")
      .join(
        "organizations",
        "affiliations.organization",
        "=",
        "organizations.id"
      )
      .select<RawAffiliation>("affiliations.*")
      .where({ "affiliations.id": id })
      .andWhereNot({
        "affiliations.membershipStatus": MembershipStatus.Inactive,
        "organizations.active": false
      })
      .first();

    return valid(
      result ? await rawAffiliationToAffiliation(connection, result) : null
    );
  }
);

export const readManyAffiliations = tryDb<[Id, Session?], AffiliationSlim[]>(
  async (connection, userId, session) => {
    const results: RawAffiliation[] = await connection<RawAffiliation>(
      "affiliations"
    )
      .join(
        "organizations",
        "affiliations.organization",
        "=",
        "organizations.id"
      )
      .select("affiliations.*")
      .where({
        "affiliations.user": userId,
        "organizations.active": true
      })
      .andWhereNot({ membershipStatus: MembershipStatus.Inactive });
    return valid(
      await Promise.all(
        results.map(
          async (raw) =>
            await rawAffiliationToAffiliationSlim(connection, raw, session)
        )
      )
    );
  }
);

export const readManyAffiliationsForOrganization = tryDb<
  [Id],
  AffiliationMember[]
>(async (connection, orgId) => {
  const results: RawAffiliation[] = await connection<RawAffiliation>(
    "affiliations"
  )
    .join("users", "affiliations.user", "=", "users.id")
    .join("organizations", "affiliations.organization", "=", "organizations.id")
    .where({
      "affiliations.organization": orgId,
      "organizations.active": true
    })
    .andWhereNot({ membershipStatus: MembershipStatus.Inactive })
    .select("affiliations.*");
  return valid(
    await Promise.all(
      results.map(
        async (raw) => await rawAffiliationToAffiliationMember(connection, raw)
      )
    )
  );
});

export const createAffiliation = tryDb<[CreateAffiliationParams], Affiliation>(
  async (connection, affiliation) => {
    const now = new Date();
    if (!affiliation) {
      throw new Error("unable to create affiliation");
    }

    const [result] = await connection<RawAffiliation>("affiliations").insert(
      {
        ...affiliation,
        id: generateUuid(),
        createdAt: now,
        updatedAt: now
      } as RawAffiliation,
      "*"
    );

    if (!result) {
      throw new Error("unable to create affiliation");
    }

    return valid(await rawAffiliationToAffiliation(connection, result));
  }
);

export const approveAffiliation = tryDb<[Id], Affiliation>(
  async (connection, id) => {
    const now = new Date();
    const [result] = await connection<RawAffiliation>("affiliations")
      .update(
        {
          membershipStatus: MembershipStatus.Active,
          updatedAt: now
        } as RawAffiliation,
        "*"
      )
      .where({
        id
      })
      .whereIn("organization", function () {
        this.select("id").from("organizations").where({
          active: true
        });
      });
    if (!result) {
      throw new Error("unable to approve affiliation");
    }
    return valid(await rawAffiliationToAffiliation(connection, result));
  }
);

export const updateAdminStatus = tryDb<
  [Id, MembershipType, AuthenticatedSession],
  Affiliation
>(
  async (
    connection,
    id,
    membershipType: MembershipType,
    session: AuthenticatedSession
  ) => {
    const now = new Date();
    return await connection.transaction(async (trx) => {
      const [affiliation] = await connection<RawAffiliation>("affiliations")
        .transacting(trx)
        .update(
          {
            membershipType,
            updatedAt: now
          } as RawAffiliation,
          "*"
        )
        .where({
          id
        })
        .whereIn("organization", function () {
          this.select("id").from("organizations").where({
            active: true
          });
        });

      if (!affiliation) {
        throw new Error("unable to update admin status");
      }

      const [affiliationEvent] = await connection<RawHistoryRecord>(
        "affiliationEvents"
      )
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            affiliation: affiliation.id,
            event:
              membershipType === MembershipType.Admin
                ? AffiliationEvent.AdminStatusGranted
                : AffiliationEvent.AdminStatusRevoked,
            createdAt: now,
            createdBy: session.user.id
          },
          "*"
        );

      if (!affiliationEvent) {
        throw new Error("unable to create affiliation event");
      }

      return valid(await rawAffiliationToAffiliation(connection, affiliation));
    });
  }
);

export const deleteAffiliation = tryDb<[Id], Affiliation>(
  async (connection, id) => {
    const now = new Date();
    const [result] = await connection<RawAffiliation>("affiliations")
      .update(
        {
          membershipStatus: MembershipStatus.Inactive,
          updatedAt: now
        } as RawAffiliation,
        "*"
      )
      .where({
        id
      })
      .whereIn("organization", function () {
        this.select("id").from("organizations").where({
          active: true
        });
      });
    if (!result) {
      throw new Error("unable to delete affiliation");
    }
    return valid(await rawAffiliationToAffiliation(connection, result));
  }
);

/**
 *
 * @param membershipType
 * @returns boolean
 */
function makeIsUserTypeChecker(
  membershipType: MembershipType
): (connection: Connection, user: User, ordId: Id) => Promise<boolean> {
  return async (connection: Connection, user: User, orgId: Id) => {
    if (!user) {
      return false;
    }
    const result = await connection<RawAffiliation>("affiliations")
      .where({
        user: user.id,
        organization: orgId,
        membershipType,
        membershipStatus: MembershipStatus.Active
      })
      .first();

    return !!result;
  };
}
const isUserAdminOfOrg = makeIsUserTypeChecker(MembershipType.Admin);

export const isUserOwnerOfOrg = makeIsUserTypeChecker(MembershipType.Owner);

/**
 * If you have the orgId and user you can check if they are either an ADMIN or
 * OWNER of an organization
 *
 * @param connection
 * @param user
 * @param orgId
 * @returns Promise<boolean>
 */
export const isUserOwnerOrAdminOfOrg = async (
  connection: Connection,
  user: User,
  orgId: Id
) =>
  (await isUserOwnerOfOrg(connection, user, orgId)) ||
  (await isUserAdminOfOrg(connection, user, orgId));

export async function readActiveOwnerCount(
  connection: Connection,
  orgId: Id
): Promise<number> {
  try {
    const result = await connection("affiliations")
      .join(
        "organizations",
        "affiliations.organization",
        "=",
        "organizations.id"
      )
      .select<RawAffiliation[]>("affiliations.*")
      .where({
        "affiliations.organization": orgId,
        "affiliations.membershipType": MembershipType.Owner,
        "affiliations.membershipStatus": MembershipStatus.Active,
        "organizations.active": true
      });
    return result ? result.length : 0;
  } catch (exception) {
    return 0;
  }
}

/**
 * Checks to see if a user has a memberStatus that is active and a membershipType
 * that is either Admin or Owner.
 *
 * @param connection - Knex connection
 * @param userId - unique identifier for user
 * @returns Promise<Promise<OrgIds> - Returns an object of organizationIds or null.
 */
export async function getOrgIdsForOwnerOrAdmin(
  connection: Connection,
  userId: Id
): Promise<Promise<OrgIds>> {
  const result = await connection("affiliations")
    .distinct<OrgIds>("organization")
    .where("membershipStatus", "ACTIVE")
    .andWhere(function () {
      this.where("membershipType", "ADMIN").orWhere("membershipType", "OWNER");
    })
    .andWhere("user", userId);
  if (!result) {
    throw new Error("unable to process orgIds for Owner or Admin");
  }
  return result;
}
