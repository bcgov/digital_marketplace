import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAffiliationId, validateOrganizationId, validateUserId } from 'back-end/lib/validation';
import { getString } from 'shared/lib';
import { Affiliation, AffiliationSlim, CreateRequestBody, CreateValidationErrors, DeleteValidationErrors, MembershipStatus, MembershipType, UpdateValidationErrors } from 'shared/lib/resources/affiliation';
import { Session } from 'shared/lib/resources/session';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, isInvalid, valid } from 'shared/lib/validation';
import * as affiliationValidation from 'shared/lib/validation/affiliation';

export interface ValidatedCreateRequestBody {
  user: Id;
  organization: Id;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
}

type ValidatedUpdateRequestBody = Id;

type ValidatedDeleteRequestBody = Id;

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
  db.Connection
>;

const resource: Resource = {
  routeNamespace: 'affiliations',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<AffiliationSlim[] | string[]>, Session>(async request => {
      const respond = (code: number, body: AffiliationSlim[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!request.session.user || !permissions.readManyAffiliations(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readManyAffiliations(connection, request.session.user.id);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    });
  },

  create(connection) {
    return {
      async parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        return {
          user: getString(body, 'user'),
          organization: getString(body, 'organization'),
          membershipType: getString(body, 'membershipType')
        };
      },
      async validateRequestBody(request) {
        const { user, organization, membershipType } = request.body;
        const validatedUser = await validateUserId(connection, user);
        const validatedOrganization = await validateOrganizationId(connection, organization);
        const validatedMembershipType = affiliationValidation.validateMembershipType(membershipType);
        if (allValid([validatedUser, validatedOrganization, validatedMembershipType])) {
          // Get the most recent affiliation for this user and organization
          const dbResult = await db.readOneAffiliation(connection, user, organization);
          if (isInvalid(dbResult)) {
            return invalid({ database: [db.ERROR_MESSAGE]});
          }
          const existingAffiliation = dbResult.value;
          let membershipStatus: MembershipStatus;
          // If existing affiliation in pending state, we check for admin perms, and create new active one
          if (existingAffiliation && existingAffiliation.membershipStatus === MembershipStatus.Pending) {
            if (!await permissions.updateAffiliation(connection, request.session, organization)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            membershipStatus = MembershipStatus.Active;
          } else { // Otherwise we are creating a brand new membership in pending state (perms for own account only)
            if (!permissions.createAffiliation(request.session, user)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            membershipStatus = MembershipStatus.Pending;
          }
          return valid({
            user,
            organization,
            membershipType: (validatedMembershipType.value as MembershipType),
            membershipStatus
          });
        } else {
          return invalid({
            user: getInvalidValue(validatedUser, undefined),
            organization: getInvalidValue(validatedOrganization, undefined),
            membershipType: getInvalidValue(validatedMembershipType, undefined)
          });
        }
      },
      respond: wrapRespond<ValidatedCreateRequestBody, CreateValidationErrors, JsonResponseBody<Affiliation>, JsonResponseBody<CreateValidationErrors>, Session>({
        valid: (async request => {
          const dbResult = await db.createAffiliation(connection, request.body);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          return basicResponse(201, request.session, makeJsonResponseBody(dbResult.value));
        }),
        invalid: (async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        })
      })
    };
  },

  update(connection) {
    return {
      async parseRequestBody(request) {
        return null;
      },
      async validateRequestBody(request) {
        const validatedAffiliation = await validateAffiliationId(connection, request.params.id);
        if (isInvalid(validatedAffiliation)) {
          return invalid({
            affiliation: getInvalidValue(validatedAffiliation, undefined)
          });
        }
        const existingAffiliation = validatedAffiliation.value;
        if (existingAffiliation.membershipStatus === MembershipStatus.Pending) {
          if (!await permissions.updateAffiliation(connection, request.session, existingAffiliation.organization.id)) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }
          return valid(existingAffiliation.id);
        }
        return invalid({
          affiliation: ['Membership is not pending.']
        });
      },
      respond: wrapRespond({
        valid: (async request => {
          const id = request.body;
          const dbResult = await db.approveAffiliation(connection, id);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE]}));
          }
          return basicResponse(200, request.session, makeJsonResponseBody(dbResult.value));
        }),
        invalid: (async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        })
      })
    };
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        const validatedAffiliationId = await validateAffiliationId(connection, request.params.id);
        if (isInvalid(validatedAffiliationId)) {
          return invalid({
            affiliation: getInvalidValue(validatedAffiliationId, undefined)
          });
        }

        const existingAffiliation = validatedAffiliationId.value;
        if (existingAffiliation.membershipType === MembershipType.Owner &&
            await db.readActiveOwnerCount(connection, existingAffiliation.organization.id) === 1) {
          return invalid({
            affiliation: ['Unable to remove membership. This is the sole owner for this organization.']
          });
        }

        if (!await permissions.deleteAffiliation(connection, request.session, existingAffiliation.user.id, existingAffiliation.organization.id)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        return valid(existingAffiliation.id);
      },
      respond: wrapRespond({
        valid: (async request => {
          const affiliationId = request.body;
          const dbResult = await db.deleteAffiliation(connection, affiliationId);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          return basicResponse(200, request.session, makeJsonResponseBody(dbResult.value));
        }),
        invalid: (async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        })
      })
    };
  }
};

export default resource;
