import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAttachments, validateCWUOpportunityId, validateCWUProposalId, validateProponent } from 'back-end/lib/validation';
import { get, omit } from 'lodash';
import { getString, getStringArray } from 'shared/lib';
import { CreateProponentRequestBody, CreateRequestBody, CreateValidationErrors, CWUProposal, CWUProposalSlim, DeleteValidationErrors, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/proposal/code-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { Id } from 'shared/lib/types';
import { allValid, getInvalidValue, invalid, isInvalid, valid } from 'shared/lib/validation';
import * as proposalValidation from 'shared/lib/validation/proposal/code-with-us';

interface ValidatedCreateRequestBody {
  session: AuthenticatedSession;
  opportunity: Id;
  proposalText: string;
  additionalComments: string;
  proponent: CreateProponentRequestBody;
  attachments: Id[];
}

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
      if (isInvalid(dbResult) || !dbResult.value) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    });
  },

  create(connection) {
    return {
      async parseRequestBody(request) {
        const body: unknown = request.body.tag === 'json' ? request.body.value : {};
        return {
          opportunity: getString(body, 'opportunity'),
          proposalText: getString(body, 'proposalText'),
          additionalComments: getString(body, 'additionalComments'),
          proponent: get(body, 'proponent'),
          attachments: getStringArray(body, 'attachments')
        };
      },
      async validateRequestBody(request) {
        const { opportunity,
                proposalText,
                additionalComments,
                proponent,
                attachments } = request.body;

        if (!permissions.createCWUProposal(request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        const validatedCWUOpportunity = await validateCWUOpportunityId(connection, opportunity, request.session);
        if (isInvalid(validatedCWUOpportunity)) {
          return invalid({
            notFound: ['The specified opportunity does not exist.']
          });
        }

        // Check for existing proposal on this opportunity, authored by this user
        const dbResult = await db.readOneProposalByOpportunityAndAuthor(connection, opportunity, request.session);
        if (isInvalid(dbResult)) {
          return invalid({
            database: [db.ERROR_MESSAGE]
          });
        }
        if (dbResult.value) {
          return invalid({
            conflict: ['You already have a proposal for this opportunity.']
          });
        }

        const validatedProposalText = proposalValidation.validateProposalText(proposalText);
        const validatedAdditionalComments = proposalValidation.validateAdditionalComments(additionalComments);
        const validatedProponent = await validateProponent(connection, proponent);
        const validatedAttachments = await validateAttachments(connection, attachments);

        if (allValid([validatedProposalText, validatedAdditionalComments, validatedProponent, validatedAttachments])) {
          return valid({
            session: request.session,
            opportunity: validatedCWUOpportunity.value.id,
            proposalText: validatedProposalText.value,
            additionalComments: validatedAdditionalComments.value,
            proponent: validatedProponent.value,
            attachments: validatedAttachments.value
          });
        } else {
          return invalid({
            opportunity: getInvalidValue(validatedCWUOpportunity, undefined),
            proposalText: getInvalidValue(validatedProposalText, undefined),
            additionalComments: getInvalidValue(validatedAdditionalComments, undefined),
            proponent: getInvalidValue(validatedProponent, undefined),
            attachments: getInvalidValue(validatedAttachments, undefined)
          });
        }
      },
      respond: wrapRespond<ValidatedCreateRequestBody, CreateValidationErrors, JsonResponseBody<CWUProposal>, JsonResponseBody<CreateValidationErrors>, Session>({
        valid: (async request => {
          const dbResult = await db.createCWUProposal(connection, omit(request.body, 'session'), request.body.session);
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
  }
};

export default resource;
