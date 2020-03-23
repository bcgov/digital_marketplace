import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAttachments, validateOrganizationId, validateSWUOpportunityId, validateSWUProposalCapabilities, validateSWUProposalId, validateSWUProposalPhase } from 'back-end/lib/validation';
import { get, omit } from 'lodash';
import { getNumber, getString, getStringArray } from 'shared/lib';
import { FileRecord } from 'shared/lib/resources/file';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { CreateRequestBody, CreateValidationErrors, DeleteValidationErrors, isValidStatusChange, SWUProposal, SWUProposalSlim, SWUProposalStatus, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/proposal/sprint-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { ADT, adt, Id } from 'shared/lib/types';
import { allValid, getInvalidValue, getValidValue, invalid, isInvalid, valid, Validation } from 'shared/lib/validation';
import * as proposalValidation from 'shared/lib/validation/proposal/sprint-with-us';

interface ValidatedCreateRequestBody extends Omit<CreateRequestBody, 'attachments'> {
  session: AuthenticatedSession;
  attachments: FileRecord[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body: ADT<'edit', ValidatedUpdateEditRequestBody>
      | ADT<'submit', string>
      | ADT<'scoreQuestions', number>
      | ADT<'scoreCodeChallenge', number>
      | ADT<'scoreTeamScenario', number>
      | ADT<'award', string>
      | ADT<'disqualify', string>
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
  },

  update(connection) {
    return {
      async parseRequestBody(request) {
        const body = request.body.tag === 'json' ? request.body.value : {};
        const tag = get(body, 'tag');
        const value: unknown = get(body, 'value');
        switch (tag) {
          case 'edit':
            return adt('edit', {
              organization: getString(value, 'organization'),
              inceptionPhase: get(value, 'inceptionPhase'),
              prototypePhase: get(value, 'prototypePhase'),
              implementationPhase: get(value, 'implementationPhase'),
              references: get(value, 'references'),
              teamQuestionResponses: get(value, 'teamQuestionResponses'),
              attachments: getStringArray(value, 'attachments')
            });
          case 'submit':
            return adt('submit', getString(body, 'value', ''));
          case 'scoreQuestions':
            return adt('scoreQuestions', getNumber<number>(body, 'value', -1, false));
          case 'scoreCodeChallenge':
            return adt('scoreCodeChallenge', getNumber<number>(body, 'value', -1, false));
          case 'scoreTeamScenario':
            return adt('scoreTeamScenario', getNumber<number>(body, 'value', -1, false));
          case 'award':
            return adt('award', getString(body, 'value', ''));
          case 'disqualify':
            return adt('disqualify', getString(body, 'value', ''));
          case 'withdraw':
            return adt('withdraw', getString(body, 'value', ''));
          default:
            return null;
        }
      },
      async validateRequestBody(request) {
        if (!request.body) { return invalid({ proposal: adt('parseFailure' as const) }); }
        if (!permissions.isSignedIn(request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const validatedSWUProposal = await validateSWUProposalId(connection, request.params.id, request.session);
        if (isInvalid(validatedSWUProposal)) {
          return invalid({ notFound: getInvalidValue(validatedSWUProposal, undefined )});
        }

        if (!permissions.editSWUProposal(connection, request.session, request.params.id)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        // Retrieve the full opportunity to validate the proposal phases against
        const swuOpportunity = getValidValue(await db.readOneSWUOpportunity(connection, validatedSWUProposal.value.opportunity.id, request.session), undefined);
        if (!swuOpportunity) {
          return invalid({
            database: [db.ERROR_MESSAGE]
          });
        }

        switch (request.body.tag) {
          case 'edit':
            const { organization,
                    inceptionPhase,
                    prototypePhase,
                    implementationPhase,
                    references,
                    teamQuestionResponses,
                    attachments } = request.body.value;

            // Organization can only changed for DRAFT or WITHDRAWN proposals
            if (![SWUProposalStatus.Draft, SWUProposalStatus.Withdrawn].includes(validatedSWUProposal.value.status) &&
                organization !== validatedSWUProposal.value.organization.id) {
              return invalid({
                proposal: adt('edit' as const, {
                  organization: ['Organization cannot be changed once the proposal has been submitted']
                })
              });
            }

            const validatedOrganization = await validateOrganizationId(connection, organization, false);
            if (isInvalid(validatedOrganization)) {
              return invalid({
                proposal: adt('edit' as const, {
                  organization: getInvalidValue(validatedOrganization, undefined)
                })
              });
            }

            // Attachments must be validated for both drafts and published opportunities
            const validatedAttachments = await validateAttachments(connection, attachments);
            if (isInvalid(validatedAttachments)) {
              return invalid({
                proposal: adt('edit' as const, {
                  attachments: validatedAttachments.value
                })
              });
            }

            // Do not validate other fields if the proposal is a draft.
            if (validatedSWUProposal.value.status === SWUProposalStatus.Draft) {
              return valid({
                session: request.session,
                body: adt('edit' as const, {
                  ...request.body.value,
                  organization: validatedOrganization.value.id,
                  attachments: validatedAttachments.value
                })
              });
            }

            const validatedInceptionPhase = await validateSWUProposalPhase(connection, inceptionPhase, swuOpportunity.inceptionPhase);
            const validatedPrototypePhase = await validateSWUProposalPhase(connection, prototypePhase, swuOpportunity.prototypePhase);
            const validatedImplementationPhase = await validateSWUProposalPhase(connection, implementationPhase, swuOpportunity.implementationPhase);
            const validatedTeamQuestionResponses = proposalValidation.validateSWUProposalTeamQuestionResponses(teamQuestionResponses);
            const validatedReferences = proposalValidation.validateSWUProposalReferences(references);
            // Validate that the total proposed cost does not exceed the max budget of the opportunity
            const validatedTotalProposedCost = proposalValidation.validateSWUProposalProposedCost(
              swuOpportunity,
              getValidValue(validatedImplementationPhase, undefined),
              getValidValue(validatedPrototypePhase, undefined),
              getValidValue(validatedInceptionPhase, undefined)
            );
            // Validate that the set of proposed capabilities across team members satisfies the opportunity required capabilities
            const validatedProposalTeam = await validateSWUProposalCapabilities(
              connection,
              swuOpportunity,
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
                body: adt('edit' as const, {
                  organization: validatedOrganization.value.id,
                  inceptionPhase: validatedInceptionPhase.value,
                  prototypePhase: validatedPrototypePhase.value,
                  implementationPhase: validatedImplementationPhase.value,
                  references: validatedReferences.value,
                  teamQuestionResponses: validatedTeamQuestionResponses.value,
                  attachments: validatedAttachments.value
                })
              } as ValidatedUpdateRequestBody);
            } else {
              return invalid({
                proposal: adt('edit' as const, {
                  inceptionPhase: getInvalidValue(validatedInceptionPhase, undefined),
                  prototypePhase: getInvalidValue(validatedPrototypePhase, undefined),
                  implementationPhase: getInvalidValue(validatedImplementationPhase, undefined),
                  references: getInvalidValue(validatedReferences, undefined),
                  teamQuestionResponses: getInvalidValue(validatedTeamQuestionResponses, undefined)
                })
              });
            }
          case 'submit':
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.Submitted, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // TODO - need to validate draft proposal here to make sure it has everything
            const validatedSubmissionNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedSubmissionNote)) {
              return invalid({ proposal: adt('submit' as const, validatedSubmissionNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('submit' as const, validatedSubmissionNote.value)
            } as ValidatedUpdateRequestBody);
          case 'scoreQuestions':
            if (validatedSWUProposal.value.status !== SWUProposalStatus.UnderReview) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            const validatedQuestionsScore = proposalValidation.validateTeamQuestionsScore(request.body.value, swuOpportunity.questionsWeight);
            if (isInvalid(validatedQuestionsScore)) {
              return invalid({
                proposal: adt('scoreQuestions' as const, getInvalidValue(validatedQuestionsScore, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('scoreQuestions' as const, validatedQuestionsScore.value)
            } as ValidatedUpdateRequestBody);
          case 'scoreCodeChallenge':
            if (validatedSWUProposal.value.status !== SWUProposalStatus.UnderReview) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            const validatedCodeChallengeScore = proposalValidation.validateCodeChallengeScore(request.body.value, swuOpportunity.codeChallengeWeight);
            if (isInvalid(validatedCodeChallengeScore)) {
              return invalid({
                proposal: adt('scoreCodeChallenge' as const, getInvalidValue(validatedCodeChallengeScore, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('scoreCodeChallenge' as const, validatedCodeChallengeScore.value)
            } as ValidatedUpdateRequestBody);
          case 'scoreTeamScenario':
            if (validatedSWUProposal.value.status !== SWUProposalStatus.UnderReview) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            const validatedTeamScenarioScore = proposalValidation.validateTeamScenarioScore(request.body.value, swuOpportunity.scenarioWeight);
            if (isInvalid(validatedTeamScenarioScore)) {
              return invalid({
                proposal: adt('scoreTeamScenario' as const, getInvalidValue(validatedTeamScenarioScore, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('scoreTeamScenario' as const, validatedTeamScenarioScore.value)
            } as ValidatedUpdateRequestBody);
          case 'award':
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.Awarded, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            const validatedAwardNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedAwardNote)) {
              return invalid({
                proposal: adt('award' as const, getInvalidValue(validatedAwardNote, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('award' as const, validatedAwardNote.value)
            } as ValidatedUpdateRequestBody);
          case 'disqualify':
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.Disqualified, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            const validatedDisqualifyNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedDisqualifyNote)) {
              return invalid({
                proposal: adt('disqualify' as const, getInvalidValue(validatedDisqualifyNote, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('disqualify' as const, validatedDisqualifyNote.value)
            } as ValidatedUpdateRequestBody);
          case 'withdraw':
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.Withdrawn, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            const validatedWithdrawnNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedWithdrawnNote)) {
              return invalid({
                proposal: adt('withdraw' as const, getInvalidValue(validatedWithdrawnNote, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('withdraw' as const, validatedWithdrawnNote.value)
            } as ValidatedUpdateRequestBody);
          default:
            return invalid({ proposal: adt('parseFailure' as const) });
        }
      },
      respond: wrapRespond<ValidatedUpdateRequestBody, UpdateValidationErrors, JsonResponseBody<SWUProposal>, JsonResponseBody<UpdateValidationErrors>, Session>({
        valid: (async request => {
          let dbResult: Validation<SWUProposal, null>;
          const { session, body } = request.body;
          switch (body.tag) {
            case 'edit':
              dbResult = await db.updateSWUProposal(connection, { ...body.value, id: request.params.id }, session);
              break;
            case 'submit':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.Submitted, body.value, session);
              break;
            case 'scoreQuestions':
              dbResult = await db.updateSWUProposalTeamQuestionScore(connection, request.params.id, body.value, session);
              break;
            case 'scoreCodeChallenge':
              dbResult = await db.updateSWUProposalCodeChallengeScore(connection, request.params.id, body.value, session);
              break;
            case 'scoreTeamScenario':
              dbResult = await db.updateSWUProposalScenarioAndPriceScores(connection, request.params.id, body.value, session);
              break;
            case 'award':
              dbResult = await db.awardSWUProposal(connection, request.params.id, body.value, session);
              break;
            case 'disqualify':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.Disqualified, body.value, session);
              break;
            case 'withdraw':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.Withdrawn, body.value, session);
              break;
          }
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
