import * as crud from 'back-end/lib/crud';
import { Connection, createAffiliation, deleteAffiliation, readActiveOwnerCount, readManyAffiliations, readOneAffiliation } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateOrganizationId, validateUserId } from 'back-end/lib/validation';
import { Affiliation, AffiliationSlim, CreateRequestBody, CreateValidationErrors, DeleteValidationErrors, MembershipStatus, MembershipType } from 'shared/lib/resources/affiliation';
import { Organization } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, valid } from 'shared/lib/validation';

export interface ValidatedCreateRequestBody extends CreateRequestBody {
  membershipType: MembershipType;
  membershipStatus?: MembershipStatus;
}

export interface ValidatedDeleteRequestBody {
  user: Id;
  organization: Id;
}

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors,
  null,
  null,
  null,
  null,
  null,
  ValidatedDeleteRequestBody,
  DeleteValidationErrors,
  Session,
  Connection
>;

const resource: Resource = {
  routeNamespace: 'affiliations',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<AffiliationSlim[] | string[]>, Session>(async request => {
      const respond = (code: number, body: AffiliationSlim[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!request.session.user || !permissions.readManyAffiliations(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const affiliations = await readManyAffiliations(connection, request.session.user.id);
      return respond(200, affiliations);
    });
  },

  create(connection) {
    return {
      parseRequestBody(request) {
        return request.body.tag === 'json' ? request.body.value : {};
      },
      async validateRequestBody(request) {
        const { user, organization, membershipType } = request.body;
        const validatedUser = user ? await validateUserId(connection, user) : invalid(['User is required']);
        const validatedOrganization = organization ? await validateOrganizationId(connection, organization) : invalid(['Organization is required']);
        if (!allValid([validatedUser, validatedOrganization])) {
          return invalid({
            user: getInvalidValue(validatedUser, undefined),
            organization: getInvalidValue(validatedOrganization, undefined)
          });
        }
        const existingAffiliation = await readOneAffiliation(connection, user, organization);
        const validResponseObject = {
          user: (validatedUser.value as User).id,
          organization: (validatedOrganization.value as Organization).id
        };
        // If no existing, active affiliation, create new affiliation with PENDING status
        if (!existingAffiliation || existingAffiliation.membershipStatus === MembershipStatus.Inactive) {
          if (!permissions.createAffiliation(request.session, user)) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          return valid({ ...validResponseObject, membershipType, membershipStatus: MembershipStatus.Pending });
        } else {
          // If existing, active affiliation, create new affiliation with ACTIVE status
          if (existingAffiliation.membershipStatus === MembershipStatus.Active) {
            if (!permissions.changeAffiliation(connection, request.session, organization)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            return valid({ ...validResponseObject, membershipType, membershipStatus: MembershipStatus.Active });
          }

          // If existing, pending affiliation, create new affiliation with ACTIVE status and existing membership
          if (existingAffiliation.membershipStatus === MembershipStatus.Pending) {
            if (!permissions.changeAffiliation(connection, request.session, organization)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            if (membershipType) {
              return invalid({
                membershipType: ['Pending membership cannot be changed.']
              });
            }
            return valid({ ...validResponseObject, membershipType: existingAffiliation.membershipStatus, membershipStatus: MembershipStatus.Active });
          }
        }

        return invalid({
          membershipType: ['Invalid membership type specified']
        });
      },
      async respond(request) {
        const respond = (code: number, body: Affiliation | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        switch (request.body.tag) {
          case 'invalid':
            if (request.body.value.permissions) {
              return basicResponse(401, request.session, makeJsonResponseBody(request.body.value));
            }
            return basicResponse(400, request.session, makeJsonResponseBody(request.body.value));
          case 'valid':
            const affiliation = await createAffiliation(connection, request.body.value);
            return respond(201, affiliation);
        }
      }
    };
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        const validatedUser = await validateUserId(connection, request.params.id);
        const validatedOrganization = await validateOrganizationId(connection, request.query.organization);
        if (!allValid([validatedUser, validatedOrganization])) {
          return invalid({
            user: getInvalidValue(validatedUser, undefined),
            organization: getInvalidValue(validatedOrganization, undefined)
          });
        }
        const existingAffiliation = await readOneAffiliation(connection, request.params.id, request.query.organization);
        if (!existingAffiliation || existingAffiliation.membershipStatus === MembershipStatus.Inactive) {
          return invalid({
            user: ['There is no active or pending membership record for this user.']
          });
        }
        if (existingAffiliation.membershipType === MembershipType.Owner && await readActiveOwnerCount(connection, request.query.organization) === 1 ) {
          return invalid({
            membershipType: ['Unable to remove membership. This is the sole owner for this organization.']
          });
        }

        return valid({
          user: (validatedUser.value as User).id,
          organization: (validatedOrganization.value as Organization).id
        });
      },
      async respond(request) {
        const respond = (code: number, body: Affiliation | DeleteValidationErrors | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (request.body.tag === 'invalid') {
          return respond(404, request.body.value);
        }
        const userId = request.body.value.user;
        const orgId = request.body.value.organization;
        if (!permissions.deleteAffiliation(connection, request.session, userId, orgId)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const deletedAffiliation = await deleteAffiliation(connection, request.body.value);
        return respond(200, deletedAffiliation);
      }
    };
  }
};

export default resource;
