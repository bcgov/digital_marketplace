import * as crud from 'back-end/lib/crud';
import { approveAffiliation, Connection, createAffiliation, deleteAffiliation, readActiveOwnerCount, readManyAffiliations, readOneAffiliation } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAffiliationId, validateOrganizationId, validateUserId } from 'back-end/lib/validation';
import { Affiliation, AffiliationSlim, CreateRequestBody, CreateValidationErrors, DeleteValidationErrors, MembershipStatus, MembershipType, UpdateValidationErrors } from 'shared/lib/resources/affiliation';
import { Organization } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, valid } from 'shared/lib/validation';
import { validateMembershipType } from 'shared/lib/validation/affiliation';

export interface ValidatedCreateRequestBody extends CreateRequestBody {
  membershipType: MembershipType;
  membershipStatus?: MembershipStatus;
}

export interface ValidatedUpdateRequestBody {
  affiliation: Id;
}

export interface ValidatedDeleteRequestBody {
  affiliation: Id;
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
  ValidatedUpdateRequestBody,
  UpdateValidationErrors,
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
        if (!existingAffiliation) {
          if (!permissions.createAffiliation(request.session, user)) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          const validatedMembershipType = validateMembershipType(membershipType);
          if (validatedMembershipType.tag === 'invalid') {
            return invalid({
              membershipType: ['Invalid membership type provided.']
            });
          }
          return valid({ ...validResponseObject, membershipType, membershipStatus: MembershipStatus.Pending });
        } else {
          // If existing, active affiliation, create new affiliation with ACTIVE status and updated role
          if (existingAffiliation.membershipStatus === MembershipStatus.Active) {
            if (!permissions.updateAffiliation(connection, request.session, organization)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }

            const validatedMembershipType = validateMembershipType(membershipType);
            if (validatedMembershipType.tag === 'invalid') {
              return invalid({
                membershipType: ['Invalid membership type provided.']
              });
            }
            return valid({ ...validResponseObject, membershipType, membershipStatus: MembershipStatus.Active });
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

  update(connection) {
    return {
      parseRequestBody(request) {
        return null;
      },
      async validateRequestBody(request) {
        const validatedAffiliationId = await validateAffiliationId(connection, request.params.id);
        if (validatedAffiliationId.tag === 'invalid') {
          return invalid({
            affiliation: getInvalidValue(validatedAffiliationId, undefined)
          });
        }
        const existingAffiliation = validatedAffiliationId.value;
        if (existingAffiliation.membershipStatus === MembershipStatus.Pending) {
          if (!permissions.updateAffiliation(connection, request.session, existingAffiliation.organization.id)) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          return valid({
            affiliation: existingAffiliation.id
          });
        }
        return invalid({
          membershipType: ['Membership is not pending.']
        });
      },
      async respond(request) {
        const respond = (code: number, body: Affiliation | UpdateValidationErrors | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (request.body.tag === 'invalid') {
          if (request.body.value.permissions) {
            return respond(401, request.body.value);
          }
          return respond(400, request.body.value);
        }
        const id = request.body.value.affiliation;
        const updatedAffiliation = await approveAffiliation(connection, id);
        return respond(200, updatedAffiliation);
      }
    };
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        const validatedAffiliationId = await validateAffiliationId(connection, request.params.id);
        if (validatedAffiliationId.tag === 'invalid') {
          return invalid({
            affiliation: getInvalidValue(validatedAffiliationId, undefined)
          });
        }

        const existingAffiliation = validatedAffiliationId.value;
        if (existingAffiliation.membershipType === MembershipType.Owner && await readActiveOwnerCount(connection, request.query.organization) === 1 ) {
          return invalid({
            membershipType: ['Unable to remove membership. This is the sole owner for this organization.']
          });
        }

        if (!permissions.deleteAffiliation(connection, request.session, existingAffiliation.user.id, existingAffiliation.organization.id)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        return valid({
          affiliation: (validatedAffiliationId.value as Affiliation).id
        });
      },
      async respond(request) {
        const respond = (code: number, body: Affiliation | DeleteValidationErrors | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        if (request.body.tag === 'invalid') {
          if (request.body.value.permissions) {
            return respond(401, request.body.value);
          }
          return respond(400, request.body.value);
        }
        const affiliationId = request.body.value.affiliation;
        const deletedAffiliation = await deleteAffiliation(connection, affiliationId);
        return respond(200, deletedAffiliation);
      }
    };
  }
};

export default resource;
