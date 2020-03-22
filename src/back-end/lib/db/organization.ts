import { generateUuid } from 'back-end/lib';
import { Connection, tryDb } from 'back-end/lib/db';
import { createAffiliation, readManyAffiliationsForOrganization } from 'back-end/lib/db/affiliation';
import { readOneFileById } from 'back-end/lib/db/file';
import { spread, union } from 'lodash';
import CAPABILITIES from 'shared/lib/data/capabilities';
import { valid } from 'shared/lib/http';
import { MembershipStatus, MembershipType } from 'shared/lib/resources/affiliation';
import { FileRecord } from 'shared/lib/resources/file';
import { Organization, OrganizationSlim } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { UserType } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { isInvalid } from 'shared/lib/validation';

type CreateOrganizationParams = Partial<Omit<Organization, 'logoImageFile'>> & { logoImageFile?: Id };

type UpdateOrganizationParams = Partial<Omit<Organization, 'logoImageFile'>> & { logoImageFile?: Id };

interface RawOrganization extends Omit<Organization, 'logoImageFile' | 'owner'> {
  logoImageFile: Id;
  ownerId: Id;
  ownerName: string;
}

interface RawOrganizationSlim extends Omit<OrganizationSlim, 'logoImageFile' | 'owner'> {
  logoImageFile?: Id;
  ownerId?: Id;
  ownerName?: string;
  acceptedSWUTerms?: boolean;
}

async function rawOrganizationToOrganization(connection: Connection, raw: RawOrganization): Promise<Organization> {
  const { logoImageFile, ownerId, ownerName, ...restOfRawOrg } = raw;
  let fetchedLogoFile: FileRecord | undefined;
  if (logoImageFile) {
    const dbResult = await readOneFileById(connection, logoImageFile);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to process organization');
    }
    fetchedLogoFile = dbResult.value;
  }
  return {
    ...restOfRawOrg,
    logoImageFile: fetchedLogoFile,
    owner: {
      id: ownerId,
      name: ownerName
    }
  };
}

async function rawOrganizationSlimToOrganizationSlim(connection: Connection, raw: RawOrganizationSlim): Promise<OrganizationSlim> {
  const { logoImageFile, ownerId, ownerName, ...restOfRawOrg } = raw;
  let fetchedLogoImageFile: FileRecord | undefined;
  if (logoImageFile) {
    const dbResult = await readOneFileById(connection, logoImageFile);
    if (isInvalid(dbResult) || !dbResult.value) {
      throw new Error('unable to process organization');
    }
    fetchedLogoImageFile = dbResult.value;
  }
  return {
    ...restOfRawOrg,
    logoImageFile: fetchedLogoImageFile,
    owner: ownerId && ownerName
      ? { id: ownerId, name: ownerName }
      : undefined
  };
}

async function calculateSWUQualifiedStatus(connection: Connection, organization: RawOrganization | RawOrganizationSlim): Promise<boolean> {
  const dbResult = await readManyAffiliationsForOrganization(connection, organization.id);
  if (isInvalid(dbResult) || !dbResult.value) {
    return false;
  }

  // Need at least two ACTIVE members, all capabilities between members, and accepted terms
  const activeMembers = dbResult.value.filter(a => a.membershipStatus === MembershipStatus.Active);
  const unionedCapabilities = spread<string[]>(union)(activeMembers.map(m => m.user.capabilities));
  if (activeMembers.length >= 2 && CAPABILITIES.every(v => unionedCapabilities.includes(v)) && organization.acceptedSWUTerms) {
    return true;
  }
  return false;
}

export const readOneOrganizationSlim = tryDb<[Id, boolean?], OrganizationSlim | null>(async (connection, opportunityId, allowInactive = false) => {
  const dbResult = await readOneOrganization(connection, opportunityId, allowInactive);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to read organization');
  }

  const { id, legalName, logoImageFile, owner, swuQualified } = dbResult.value;
  return valid({
    id,
    legalName,
    logoImageFile,
    owner,
    swuQualified
  });
});

export const readOneOrganization = tryDb<[Id, boolean?], Organization | null>(async (connection, id, allowInactive = false) => {
  const where = {
    'organizations.id': id,
    'affiliations.membershipType': MembershipType.Owner
  };
  if (!allowInactive) {
    (where as any)['organizations.active'] = true;
  }
  const result = await connection<RawOrganization>('organizations')
    .select('organizations.*', 'users.id as ownerId', 'users.name as ownerName')
    .leftOuterJoin('affiliations', 'organizations.id', '=', 'affiliations.organization')
    .leftOuterJoin('users', 'affiliations.user', '=', 'users.id')
    .where(where)
    .first() as RawOrganization;

  // Calculate swuQualified status
  if (result) {
    result.swuQualified = await calculateSWUQualifiedStatus(connection, result);
  }
  return valid(result ? await rawOrganizationToOrganization(connection, result) : null);
});

/**
 * Return all organizations from the database.
 *
 * If the user is:
 *
 * - An admin: Include owner information for all organizations.
 * - A vendor: Include owner information only for owned organizations.
 */
export const readManyOrganizations = tryDb<[Session], OrganizationSlim[]>(async (connection, session) => {
  const query = connection<RawOrganizationSlim>('organizations')
    .select('organizations.id', 'legalName', 'logoImageFile')
    .where({ active: true });
  // If a user is attached to this session, we need to add owner info to some or all of the orgs
  if (session?.user?.type === UserType.Admin || session?.user?.type === UserType.Vendor) {
    query
      .select<RawOrganizationSlim>('users.id as ownerId', 'users.name as ownerName', 'organizations.acceptedSWUTerms')
      .leftOuterJoin('affiliations', 'organizations.id', '=', 'affiliations.organization')
      .leftOuterJoin('users', 'affiliations.user', '=', 'users.id')
      .andWhere({ 'affiliations.membershipType': MembershipType.Owner });
  }
  const results = await query as RawOrganizationSlim[];

  // Calculate swuQualified status if Admin/Owner
  if (session?.user?.type === UserType.Admin || session?.user?.type === UserType.Vendor) {
    for (const result of results) {
      result.swuQualified = await calculateSWUQualifiedStatus(connection, result);
    }
  }

  // Only include ownership/qualified information for vendors' owned organizations.
  return valid(await Promise.all(results.map(async raw => {
    if (session?.user?.type === UserType.Vendor && raw.ownerId !== session?.user?.id) {
      raw = {
        ...raw,
        ownerId: undefined,
        ownerName: undefined,
        acceptedSWUTerms: undefined,
        swuQualified: undefined
      };
    }
    return await rawOrganizationSlimToOrganizationSlim(connection, raw);
  })));
});

export const createOrganization = tryDb<[Id, CreateOrganizationParams], Organization>(async (connection, user, organization) => {
  const now = new Date();
  const result: RawOrganization = await connection.transaction(async trx => {
    // Create organization
    const [result] = await connection<CreateOrganizationParams>('organizations')
      .transacting(trx)
      .insert({
        ...organization,
        id: generateUuid(),
        active: true,
        createdAt: now,
        updatedAt: now
      } as CreateOrganizationParams, ['*']);
    if (!result || !user) {
      throw new Error('unable to create organization');
    }
    // Create affiliation
    await createAffiliation(trx, {
      user,
      organization: result.id,
      membershipType: MembershipType.Owner,
      membershipStatus: MembershipStatus.Active
    });
    return result;
  });
  const dbResult = await readOneOrganization(connection, result.id);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to create organization');
  }
  return valid(dbResult.value);
});

export const updateOrganization = tryDb<[UpdateOrganizationParams], Organization>(async (connection, organization) => {
  const now = new Date();
  const [result] = await connection<UpdateOrganizationParams>('organizations')
    .where({
      id: organization && organization.id,
      active: true
    })
    .update({
      ...organization,
      updatedAt: now
    } as UpdateOrganizationParams, '*');
  if (!result || !result.id) {
    throw new Error('unable to update organization');
  }
  const dbResult = await readOneOrganization(connection, result.id, true);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error('unable to update organization');
  }
  return valid(dbResult.value);
});
