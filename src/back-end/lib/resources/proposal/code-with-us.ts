import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateCWUOpportunityId, validateCWUProposalId } from 'back-end/lib/validation';
import { CreateRequestBody, CreateValidationErrors, CWUProposal, CWUProposalSlim, DeleteValidationErrors, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/proposal/code-with-us';
import { Session } from 'shared/lib/resources/session';
import { Id } from 'shared/lib/types';
import { isInvalid } from 'shared/lib/validation';

type ValidatedCreateRequestBody = Omit<CWUProposal, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'status'>;

type ValidatedUpdateRequestBody = UpdateRequestBody;

type ValidatedDeleteRequestBody = Id;

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors,
  null,
  null,
  UpdateRequestBody | null,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors,
  ValidatedDeleteRequestBody,
  DeleteValidationErrors,
  Session,
  db.Connection
>;

const resource: Resource = {
  routeNamespace: 'code-with-us/proposal',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<CWUProposalSlim[] | string[]>, Session>(async request => {
      const respond = (code: number, body: CWUProposalSlim[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      const validatedCWUOpportunity = await validateCWUOpportunityId(connection, request.query.opportunity, request.session);
      if (isInvalid(validatedCWUOpportunity)) {
       return respond(404, ['Code With Us opportunity not found.']);
      }

      if (!await permissions.readManyCWUProposals(connection, request.session, request.query.opportunity)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readManyCWUProposals(connection, request.query.opportunity);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    });
  },

  readOne(connection) {
    return nullRequestBodyHandler<JsonResponseBody<CWUProposal | string[]>, Session>(async request => {
      const respond = (code: number, body: CWUProposal | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      const validatedCWUOpportunity = await validateCWUOpportunityId(connection, request.query.opportunity, request.session);
      if (isInvalid(validatedCWUOpportunity)) {
        return respond(404, ['Code With Us opportunity not found.']);
      }

      const validatedCWUProposal = await validateCWUProposalId(connection, request.params.id, request.session);
      if (isInvalid(validatedCWUProposal)) {
        return respond(404, ['Proposal not found.']);
      }

      if (!await permissions.readOneCWUProposal(connection, request.session, request.query.opportunity, request.params.id)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readOneCWUProposal(connection, request.params.id, request.session);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    });
  }
};

export default resource;
