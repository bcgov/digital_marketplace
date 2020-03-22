import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAttachments, validateOrganizationId, validateSWUOpportunityId, validateSWUProposalCapabilities, validateSWUProposalId, validateSWUProposalPhase } from 'back-end/lib/validation';
import { get, omit } from 'lodash';
import { getString, getStringArray } from 'shared/lib';
import { FileRecord } from 'shared/lib/resources/file';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { CreateRequestBody, CreateValidationErrors, DeleteValidationErrors, SWUProposal, SWUProposalSlim, SWUProposalStatus, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/proposal/sprint-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { ADT, Id } from 'shared/lib/types';
import { allValid, getInvalidValue, getValidValue, invalid, isInvalid, valid } from 'shared/lib/validation';
import * as proposalValidation from 'shared/lib/validation/proposal/sprint-with-us';

interface ValidatedCreateRequestBody extends Omit<CreateRequestBody, 'attachments'> {
  session: AuthenticatedSession;
  attachments: FileRecord[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body: ADT<'edit', ValidatedUpdateEditRequestBody>
      | ADT<'submit', string>
      | ADT<'scoreQuestions', string>
      | ADT<'scoreCodeChallenge', number>
      | ADT<'scoreTeamScenario', number>
      | ADT<'award', string>
      | ADT<'withdraw', string>;
}

type ValidatedUpdateEditRequestBody = Omit<ValidatedCreateRequestBody, 'opportunity' | 'status' | 'session'>;

type ValidatedDeleteRequestBody = Id;

type Resource = crud.Resource<
  SupportedRequestBodies,
  SupportedResponseBodies,
  Omit<CreateRequestBody, 'status'> & { status: string; },
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
  routeNamespace: 'proposals/sprint-with-us',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<SWUProposalSlim[] | string[]>, Session>(async request => {
      const respond = (code: number, body: SWUProposalSlim[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      const validatedSWUOpportunity = await validateSWUOpportunityId(connection, request.query.opportunity, request.session);
      if (isInvalid(validatedSWUOpportunity)) {
        return respond(404, ['Sprint With Us opportunity not found.']);
      }

      if (!permissions.isSignedIn(request.session) || !await permissions.readManySWUProposals(connection, request.session, validatedSWUOpportunity.value)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readManySWUProposals(connection, request.session, request.query.opportunity);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    });
  },

  readOne(connection) {
    return nullRequestBodyHandler<JsonResponseBody<SWUProposal | string[]>, Session>(async request => {
      const respond = (code: number, body: SWUProposal | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      if (!permissions.isSignedIn(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const validatedSWUProposal = await validateSWUProposalId(connection, request.params.id, request.session);
      if (isInvalid(validatedSWUProposal)) {
        return respond(404, ['Proposal not found.']);
      }
      if (!await permissions.readOneSWUProposal(connection, request.session, validatedSWUProposal.value)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      return respond(200, validatedSWUProposal.value);
    });
  },

  create(connection) {
    return {
      async parseRequestBody(request) {
        const body: unknown = request.body.tag === 'json' ? request.body.value : {};
        return {
          opportunity: getString(body, 'opportunity'),
          organization: getString(body, 'organization'),
          attachments: getStringArray(body, 'attachments'),
          status: getString(body, 'status'),
          inceptionPhase: get(body, 'inceptionPhase'),
          prototypePhase: get(body, 'prototypePhase'),
          implementationPhase: get(body, 'implementationPhase'),
          teamQuestionResponses: get(body, 'teamQuestionResponses'),
          references: get(body, 'references')
        };
      },
      async validateRequestBody(request) {
        const { opportunity,
                organization,
                attachments,
                status,
                inceptionPhase,
                prototypePhase,
                implementationPhase,
                teamQuestionResponses,
                references } = request.body;

        const validatedOrganization = await validateOrganizationId(connection, organization);
        if (isInvalid(validatedOrganization)) {
          return invalid({
            organization: validatedOrganization.value
          });
        }

        if (!permissions.isSignedIn(request.session) || !await permissions.createSWUProposal(connection, request.session, validatedOrganization.value)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        const validatedStatus = proposalValidation.validateCreateSWUProposalStatus(status);
        if (isInvalid(validatedStatus)) {
          return invalid({
            status: validatedStatus.value
          });
        }

        const validatedSWUOpportunity = await validateSWUOpportunityId(connection, opportunity, request.session);
        if (isInvalid(validatedSWUOpportunity)) {
          return invalid({
            notFound: getInvalidValue(validatedSWUOpportunity, undefined)
          });
        }

        // Check for existing proposal on this opportunity, authored by this user
        // Possible TODO - should a user be able to submit multiple proposals for different organizations?
        // May need to extend this validation (may also apply to CWU)
        const dbResult = await db.readOneSWUProposalByOpportunityAndAuthor(connection, opportunity, request.session);
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

        // Attachments must be validated for both drafts and published opportunities.
        const validatedAttachments = await validateAttachments(connection, attachments);
        if (isInvalid(validatedAttachments)) {
          return invalid({
            attachments: validatedAttachments.value
          });
        }

        // Only validate other fields if not in draft
        if (validatedStatus.value === SWUProposalStatus.Draft) {
          return valid({
            ...request.body,
            session: request.session,
            opportunity: validatedSWUOpportunity.value.id,
            status: validatedStatus.value,
            attachments: validatedAttachments.value
          });
        }

        const validatedInceptionPhase = await validateSWUProposalPhase(connection, inceptionPhase, validatedSWUOpportunity.value.inceptionPhase);
        const validatedPrototypePhase = await validateSWUProposalPhase(connection, prototypePhase, validatedSWUOpportunity.value.prototypePhase);
        const validatedImplementationPhase = await validateSWUProposalPhase(connection, implementationPhase, validatedSWUOpportunity.value.implementationPhase);
        const validatedTeamQuestionResponses = proposalValidation.validateSWUProposalTeamQuestionResponses(teamQuestionResponses);
        const validatedReferences = proposalValidation.validateSWUProposalReferences(references);
        // Validate that the total proposed cost does not exceed the max budget of the opportunity
        const validatedTotalProposedCost = proposalValidation.validateSWUProposalProposedCost(
          validatedSWUOpportunity.value,
          getValidValue(validatedImplementationPhase, undefined),
          getValidValue(validatedPrototypePhase, undefined),
          getValidValue(validatedInceptionPhase, undefined)
        );
        // Validate that the set of proposed capabilities across team members satisfies the opportunity required capabilities
        const validatedProposalTeam = await validateSWUProposalCapabilities(
          connection,
          validatedSWUOpportunity.value,
          getValidValue(validatedInceptionPhase, undefined),
          getValidValue(validatedPrototypePhase, undefined),
          getValidValue(validatedImplementationPhase, undefined)
        );

        if (allValid([
          validatedInceptionPhase,
          validatedPrototypePhase,
          validatedImplementationPhase,
          validatedTeamQuestionResponses,
          validatedReferences,
          validatedTotalProposedCost,
          validatedProposalTeam
        ])) {
          return valid({
            session: request.session,
            opportunity: validatedSWUOpportunity.value.id,
            organization: (validatedOrganization.value as OrganizationSlim).id,
            status: validatedStatus.value,
            attachments: validatedAttachments.value,
            inceptionPhase: validatedInceptionPhase.value,
            prototypePhase: validatedPrototypePhase.value,
            implementationPhase: validatedImplementationPhase.value,
            teamQuestionResponses: validatedTeamQuestionResponses.value,
            references: validatedReferences.value
          } as ValidatedCreateRequestBody);
        } else {
          return invalid({
            inceptionPhase: getInvalidValue(validatedInceptionPhase, undefined),
            prototypePhase: getInvalidValue(validatedPrototypePhase, undefined),
            implementationPhase: getInvalidValue(validatedImplementationPhase, undefined),
            teamQuestionResponses: getInvalidValue(validatedTeamQuestionResponses, undefined),
            references: getInvalidValue(validatedReferences, undefined),
            totalProposedCost: getInvalidValue(validatedTotalProposedCost, undefined),
            team: getInvalidValue(validatedProposalTeam, undefined)
          });
        }
      },
      respond: wrapRespond<ValidatedCreateRequestBody, CreateValidationErrors, JsonResponseBody<SWUProposal>, JsonResponseBody<CreateValidationErrors>, Session>({
        valid: (async request => {
          const dbResult = await db.createSWUProposal(connection, omit(request.body, 'session'), request.body.session);
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
