import * as crud from 'back-end/lib/crud';
import { Connection, createAffiliation, readManyAffiliations } from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateOrganizationId, validateUserId } from 'back-end/lib/validation';
import { Affiliation, AffiliationSlim, CreateRequestBody, CreateValidationErrors, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/affiliation';
import { Organization } from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { allValid, getInvalidValue, invalid, valid } from 'shared/lib/validation';
import { validateMembershipType } from 'shared/lib/validation/affiliation';

export type ValidatedUpdateRequestBody = UpdateRequestBody;

export type ValidatedCreateRequestBody = CreateRequestBody;

type DeleteValidatedReqBody = Affiliation;

type DeleteReqBodyErrors = string[];

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
  DeleteValidatedReqBody,
  DeleteReqBodyErrors,
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
        const validatedOrganization = organization ? await validateOrganizationId(connection, organization) : invalid(['Organizaion is required']);
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
            const userId = request.body.value.user;
            if (!permissions.createAffiliation(request.session, userId)) {
              return respond(401, [permissions.ERROR_MESSAGE]);
            }
            const affiliation = await createAffiliation(connection, request.body.value);
            return basicResponse(201, request.session, makeJsonResponseBody(affiliation));
        }
      }
    };
  }
};

export default resource;
