import * as crud from 'back-end/lib/crud';
import { Connection, createAffiliation, deleteAffiliation, readManyAffiliations, updateAffiliation } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateOrganizationId, validateUserId } from 'back-end/lib/validation';
import { getString } from 'shared/lib';
import { Affiliation, AffiliationSlim, CreateRequestBody, CreateValidationErrors, DeleteValidationErrors, MembershipType, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/affiliation';
import { Organization } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, valid } from 'shared/lib/validation';
import { validateMembershipType } from 'shared/lib/validation/affiliation';

export type ValidatedUpdateRequestBody = UpdateRequestBody;

export interface ValidatedCreateRequestBody extends CreateRequestBody {
  membershipType: MembershipType;
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
  UpdateRequestBody,
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
        const { user, organization } = request.body;
        const validatedUser = user ? await validateUserId(connection, user) : invalid(['User is required']);
        const validatedOrganization = organization ? await validateOrganizationId(connection, organization) : invalid(['Organizaion is required']);

        if (allValid([validatedUser, validatedOrganization])) {
          return valid({
            user: (validatedUser.value as User).id,
            organization: (validatedOrganization.value as Organization).id,
            membershipType: MembershipType.Pending // New affiliations are always created with pending status
          });
        } else {
          return invalid({
            user: getInvalidValue(validatedUser, undefined),
            organization: getInvalidValue(validatedOrganization, undefined)
          });
        }
      },
      async respond(request) {
        const respond = (code: number, body: Affiliation | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        switch (request.body.tag) {
          case 'invalid':
            return basicResponse(400, request.session, makeJsonResponseBody(request.body.value));
          case 'valid':
            const userId = request.body.value.user;
            if (!permissions.createAffiliation(request.session, userId)) {
              return respond(401, [permissions.ERROR_MESSAGE]);
            }
            const affiliation = await createAffiliation(connection, request.body.value);
            return basicResponse(201, request.session, makeJsonResponseBody(affiliation));
        }
      }
    };
  },

  update(connection) {
    return {
      parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        return {
          user: request.params.id, // URL param for id is actually the user id, not affiliation id
          organization: request.query.organization,
          membershipType: getString(body, 'membershipType') as MembershipType
        };
      },
      async validateRequestBody(request) {
        const { user, organization, membershipType } = request.body;
        const validatedUser = user ? await validateUserId(connection, user) : invalid(['User is required']);
        const validatedOrganization = organization ? await validateOrganizationId(connection, organization) : invalid(['Organization is required']);
        const validatedMembershipType = membershipType ? validateMembershipType(membershipType) : invalid(['Membership Type is required']);

        if (allValid([validatedUser, validatedOrganization, validatedMembershipType])) {
          return valid({
            user: (validatedUser.value as User).id,
            organization: (validatedOrganization.value as Organization).id,
            membershipType: validatedMembershipType.value
          });
        } else {
          return invalid({
            user: getInvalidValue(validatedUser, undefined),
            organization: getInvalidValue(validatedOrganization, undefined),
            membershipType: getInvalidValue(validatedMembershipType, undefined)
          });
        }
      },
      async respond(request) {
        const respond = (code: number, body: Affiliation | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
        switch (request.body.tag) {
          case 'invalid':
            return basicResponse(400, request.session, makeJsonResponseBody(request.body.value));
          case 'valid':
            const orgId = request.body.value.organization;
            if (!await permissions.updateAffiliation(connection, request.session, orgId)) {
              return respond(401, [permissions.ERROR_MESSAGE]);
            }
            const updatedAffiliation = await updateAffiliation(connection, request.body.value);
            return respond(200, updatedAffiliation);
        }
      }
    };
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        const validatedUser = await validateUserId(connection, request.params.id);
        const validatedOrganization = await validateOrganizationId(connection, request.query.organization);
        if (allValid([validatedUser, validatedOrganization])) {
          return valid({
            user: (validatedUser.value as User).id,
            organization: (validatedOrganization.value as Organization).id
          });
        } else {
          return invalid({
            user: getInvalidValue(validatedUser, undefined),
            organization: getInvalidValue(validatedOrganization, undefined)
          });
        }
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
