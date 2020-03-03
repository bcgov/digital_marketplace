import { generateUuid } from 'back-end/lib';
import { Connection, tryDb } from 'back-end/lib/db';
import { readOneOrganization } from 'back-end/lib/db/organization';
import { readOneUser } from 'back-end/lib/db/user';
import { valid } from 'shared/lib/http';
import { Affiliation, AffiliationSlim, MembershipStatus, MembershipType } from 'shared/lib/resources/affiliation';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { getValidValue } from 'shared/lib/validation';

type CreateAffiliationParams = Partial<Omit<Affiliation, 'user' | 'organization'>> & { user: Id, organization: Id };

interface RawAffiliation {
  id: Id;
  user: Id;
  organization: Id;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

async function rawAffiliationToAffiliation(connection: Connection, params: RawAffiliation): Promise<Affiliation> {
  const { user: userId, organization: orgId } = params;
  const organization = getValidValue(await readOneOrganization(connection, orgId), null);
  const user = getValidValue(await readOneUser(connection, userId), null);
  if (!user || !organization) {
    throw new Error('unable to process affiliation'); // Will be caught by calling function
  }
  return {
    ...params,
    user,
    organization
  };
}

async function rawAffiliationToAffiliationSlim(connection: Connection, params: RawAffiliation): Promise<AffiliationSlim> {
  const { id, organization: orgId, membershipType } = params;
  const organization = getValidValue(await readOneOrganization(connection, orgId), null);
  if (!organization) {
    throw new Error('unable to process affiliation'); // Will be caught by calling function
  }
  return {
    id,
    membershipType,
    organization: {
      id: organization.id,
      legalName: organization.legalName
    }
  };
}

export const readOneAffiliation = tryDb<[Id, Id], Affiliation | null>(async (connection, user, organization) => {
  const result = await connection<RawAffiliation>('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select<RawAffiliation>('affiliations.*')
    .where({
      'affiliations.user': user,
      'affiliations.organization': organization
    })
    .andWhereNot({
      'affiliations.membershipStatus': MembershipStatus.Inactive,
      'organizations.active': false
    })
    .orderBy('createdAt')
    .first();

  return valid(result ? await rawAffiliationToAffiliation(connection, result) : null);
});

export const readOneAffiliationById = tryDb<[Id], Affiliation | null>(async (connection, id) => {
  const result = await connection<RawAffiliation>('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select<RawAffiliation>('affiliations.*')
    .where({ 'affiliations.id': id })
    .andWhereNot({
      'affiliations.membershipStatus': MembershipStatus.Inactive,
      'organizations.active': false
    })
    .first();

  return valid(result ? await rawAffiliationToAffiliation(connection, result) : null);
});

export const readManyAffiliations = tryDb<[Id], AffiliationSlim[]>(async (connection, userId) => {
  const results: RawAffiliation[] = await connection<RawAffiliation>('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select('affiliations.*')
    .where({
      'affiliations.user': userId,
      'organizations.active': true
    })
    .andWhereNot({ membershipStatus: MembershipStatus.Inactive });
  return valid(await Promise.all(results.map(async raw => await rawAffiliationToAffiliationSlim(connection, raw))));
});

export const createAffiliation = tryDb<[CreateAffiliationParams], Affiliation>(async (connection, affiliation) => {
  const now = new Date();
  if (!affiliation) {
    throw new Error('unable to create affiliation');
  }

  const [result] = await connection<RawAffiliation>('affiliations')
    .insert({
      ...affiliation,
      id: generateUuid(),
      createdAt: now,
      updatedAt: now
    } as RawAffiliation, '*');

  if (!result) {
    throw new Error('unable to create affiliation');
  }

  // TODO: send invitation email once emails notifications are in place.
  return valid(await rawAffiliationToAffiliation(connection, result));
});

export const approveAffiliation = tryDb<[Id], Affiliation>(async (connection, id) => {
  const now = new Date();
  const [result] = await connection<RawAffiliation>('affiliations')
    .update({
      membershipStatus: MembershipStatus.Active,
      updatedAt: now
    } as RawAffiliation, '*')
    .where({
      id
    })
    .whereIn('organization', function() {
      this.select('id')
          .from('organizations')
          .where({
            active: true
          });
    });
  if (!result) {
    throw new Error('unable to approve affiliation');
  }
  return valid(await rawAffiliationToAffiliation(connection, result));
});

export const deleteAffiliation = tryDb<[Id], Affiliation>(async (connection, id) => {
  const now = new Date();
  const [result] = await connection<RawAffiliation>('affiliations')
    .update({
      membershipStatus: MembershipStatus.Inactive,
      updatedAt: now
    } as RawAffiliation, '*')
    .where({
      id
    })
    .whereIn('organization', function() {
      this.select('id')
          .from('organizations')
          .where({
            active: true
          });
    });
  if (!result) {
    throw new Error('unable to delete affiliation');
  }
  return valid(await rawAffiliationToAffiliation(connection, result));
});

export async function isUserOwnerOfOrg(connection: Connection, user: User, orgId: Id): Promise<boolean> {
  if (!user) {
    return false;
  }
  const result = await connection<RawAffiliation>('affiliations')
    .where ({ user: user.id, organization: orgId, membershipType: MembershipType.Owner })
    .first();

  return !!result;
}

export async function readActiveOwnerCount(connection: Connection, orgId: Id): Promise<number> {
  try {
    const result = await connection('affiliations')
    .join('organizations', 'affiliations.organization', '=', 'organizations.id')
    .select<RawAffiliation[]>('affiliations.*')
    .where({
      'affiliations.organization': orgId,
      'affiliations.membershipType': MembershipType.Owner,
      'affiliations.membershipStatus': MembershipStatus.Active,
      'organizations.active': true
    });
    return result ? result.length : 0;
  } catch (exception) {
    return 0;
  }
}
