import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as swuProposalNotifications from 'back-end/lib/mailer/notifications/proposal/sprint-with-us';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAttachments, validateOrganizationId, validateSWUOpportunityId, validateSWUProposalId, validateSWUProposalOrganization, validateSWUProposalPhase, validateSWUProposalTeam, validateSWUProposalTeamMembers } from 'back-end/lib/validation';
import { get, omit } from 'lodash';
import { getNumber, getString, getStringArray } from 'shared/lib';
import { FileRecord } from 'shared/lib/resources/file';
import { SWUOpportunityStatus } from 'shared/lib/resources/opportunity/sprint-with-us';
import { OrganizationSlim } from 'shared/lib/resources/organization';
import { CreateRequestBody, CreateValidationErrors, DeleteValidationErrors, isValidStatusChange, SWUProposal, SWUProposalSlim, SWUProposalStatus, UpdateEditValidationErrors, UpdateRequestBody, UpdateTeamQuestionScoreBody, UpdateValidationErrors } from 'shared/lib/resources/proposal/sprint-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { ADT, adt, Id } from 'shared/lib/types';
import { allValid, getInvalidValue, getValidValue, invalid, isInvalid, isValid, optionalAsync, valid, Validation } from 'shared/lib/validation';
import * as proposalValidation from 'shared/lib/validation/proposal/sprint-with-us';

interface ValidatedCreateRequestBody extends Omit<CreateRequestBody, 'attachments'> {
  session: AuthenticatedSession;
  attachments: FileRecord[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body: ADT<'edit', ValidatedUpdateEditRequestBody>
      | ADT<'submit', string>
      | ADT<'scoreQuestions', UpdateTeamQuestionScoreBody[]>
      | ADT<'screenInToCodeChallenge', string>
      | ADT<'screenOutFromCodeChallenge', string>
      | ADT<'scoreCodeChallenge', number>
      | ADT<'screenInToTeamScenario', string>
      | ADT<'screenOutFromTeamScenario', string>
      | ADT<'scoreTeamScenario', number>
      | ADT<'award', string>
      | ADT<'disqualify', string>
      | ADT<'withdraw', string>;
}

type ValidatedUpdateEditRequestBody = Omit<ValidatedCreateRequestBody, 'opportunity' | 'status' | 'session'>;

interface ValidatedDeleteRequestBody {
  proposal: Id;
  session: AuthenticatedSession;
}

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
      if (request.query.opportunity) {
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
      } else {
        if (!permissions.isSignedIn(request.session) || !permissions.readOwnCWUProposals(request.session)) {
          return respond(401, [permissions.ERROR_MESSAGE]);
        }
        const dbResult = await db.readOwnSWUProposals(connection, request.session);
        if (isInvalid(dbResult)) {
          return respond(503, [db.ERROR_MESSAGE]);
        }
        return respond(200, dbResult.value);
      }
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
          organization: getString(body, 'organization', undefined),
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

        if (!permissions.isSignedIn(request.session) || !await permissions.createSWUProposal(connection, request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        const validatedOrganization = await optionalAsync(organization, v => validateOrganizationId(connection, v, request.session));
        if (isInvalid(validatedOrganization)) {
          return invalid({
            organization: validatedOrganization.value
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
            inceptionPhase: inceptionPhase ? {
              members: get(inceptionPhase, 'members', []),
              proposedCost: getNumber<number>(inceptionPhase, 'proposedCost')
            } : undefined,
            prototypePhase: prototypePhase ? {
              members: get(prototypePhase, 'members', []),
              proposedCost: getNumber<number>(prototypePhase, 'proposedCost')
            } : undefined,
            implementationPhase: {
              members: get(implementationPhase, 'members', []),
              proposedCost: getNumber<number>(implementationPhase, 'proposedCost')
            },
            references: references ? references.map(ref => ({
              name: getString(ref, 'name'),
              company: getString(ref, 'company'),
              phone: getString(ref, 'phone'),
              email: getString(ref, 'email'),
              order: getNumber<number>(ref, 'order')
            })) : [],
            teamQuestionResponses: teamQuestionResponses ? teamQuestionResponses.map(q => ({
              response: getString(q, 'response'),
              order: getNumber<number>(q, 'order')
            })) : [],
            session: request.session,
            opportunity: validatedSWUOpportunity.value.id,
            organization: organization || undefined,
            status: validatedStatus.value,
            attachments: validatedAttachments.value
          });
        }

        // Ensure organization was provided
        if (!validatedOrganization.value) {
          return invalid({
            organization: ['An organization must be specified before submitting.']
          });
        }

        // Prior to submitting, re-check permissions
        if (!await permissions.submitSWUProposal(connection, request.session, validatedOrganization.value)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        const validatedInceptionPhase = await validateSWUProposalPhase(connection, inceptionPhase, validatedSWUOpportunity.value.inceptionPhase || null, validatedOrganization.value.id);
        const validatedPrototypePhase = await validateSWUProposalPhase(connection, prototypePhase, validatedSWUOpportunity.value.prototypePhase || null, validatedOrganization.value.id);
        const validatedImplementationPhase = await validateSWUProposalPhase(connection, implementationPhase, validatedSWUOpportunity.value.implementationPhase, validatedOrganization.value.id);
        const validatedTeamQuestionResponses = proposalValidation.validateSWUProposalTeamQuestionResponses(teamQuestionResponses, validatedSWUOpportunity.value.teamQuestions);
        const validatedReferences = proposalValidation.validateSWUProposalReferences(references);
        // Validate that the total proposed cost does not exceed the max budget of the opportunity
        const validatedTotalProposedCost = proposalValidation.validateSWUProposalProposedCost(
          getValidValue(validatedInceptionPhase, null)?.proposedCost || 0,
          getValidValue(validatedPrototypePhase, null)?.proposedCost || 0,
          getValidValue(validatedImplementationPhase, null)?.proposedCost || 0,
          validatedSWUOpportunity.value.totalMaxBudget
        );
        // Validate that the set of proposed capabilities across team members satisfies the opportunity required capabilities
        const validatedProposalTeam = await validateSWUProposalTeam(
          connection,
          validatedSWUOpportunity.value,
          getValidValue(validatedInceptionPhase, null)?.members.map(m => m.member) || [],
          getValidValue(validatedPrototypePhase, null)?.members.map(m => m.member) || [],
          getValidValue(validatedImplementationPhase, null)?.members.map(m => m.member) || []
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
          // Notify of submitted proposal if applicable
          if (dbResult.value.status === SWUProposalStatus.Submitted) {
            swuProposalNotifications.handleSWUProposalSubmitted(connection, dbResult.value.id, request.body.session);
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
            return adt('scoreQuestions', value as UpdateTeamQuestionScoreBody[]);
          case 'screenInToCodeChallenge':
            return adt('screenInToCodeChallenge', getString(body, 'value'));
          case 'screenOutFromCodeChallenge':
            return adt('screenOutFromCodeChallenge', getString(body, 'value'));
          case 'scoreCodeChallenge':
            return adt('scoreCodeChallenge', getNumber<number>(body, 'value', -1, false));
          case 'screenInToTeamScenario':
            return adt('screenInToTeamScenario', getString(body, 'value'));
          case 'screenOutFromTeamScenario':
            return adt('screenOutFromTeamScenario', getString(body, 'value'));
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

        // Retrieve the full opportunity to validate the proposal phases against
        const swuOpportunity = getValidValue(await db.readOneSWUOpportunity(connection, validatedSWUProposal.value.opportunity.id, request.session), undefined);
        if (!swuOpportunity) {
          return invalid({
            database: [db.ERROR_MESSAGE]
          });
        }

        if (!await permissions.editSWUProposal(connection, request.session, request.params.id, swuOpportunity)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        switch (request.body.tag) {
          case 'edit': {
            const { organization,
                    inceptionPhase,
                    prototypePhase,
                    implementationPhase,
                    references,
                    teamQuestionResponses,
                    attachments } = request.body.value;

            const validatedOrganization = await validateSWUProposalOrganization(connection, organization, request.session);
            if (isInvalid(validatedOrganization)) {
              return invalid({
                proposal: adt('edit' as const, {
                  organization: getInvalidValue(validatedOrganization, undefined)
                })
              });
            }

            // Organization can only changed for DRAFT or WITHDRAWN proposals
            if (![SWUProposalStatus.Draft, SWUProposalStatus.Withdrawn].includes(validatedSWUProposal.value.status) &&
                organization !== validatedSWUProposal.value.organization?.id) {
              return invalid({
                proposal: adt('edit' as const, {
                  organization: ['Organization cannot be changed once the proposal has been submitted']
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
                  inceptionPhase: inceptionPhase ? {
                    members: get(inceptionPhase, 'members', []),
                    proposedCost: getNumber<number>(inceptionPhase, 'proposedCost')
                  } : undefined,
                  prototypePhase: prototypePhase ? {
                    members: get(prototypePhase, 'members', []),
                    proposedCost: getNumber<number>(prototypePhase, 'proposedCost')
                  } : undefined,
                  implementationPhase: {
                    members: get(implementationPhase, 'members', []),
                    proposedCost: getNumber<number>(implementationPhase, 'proposedCost')
                  },
                  references: references ? references.map(ref => ({
                    name: getString(ref, 'name'),
                    company: getString(ref, 'company'),
                    phone: getString(ref, 'phone'),
                    email: getString(ref, 'email'),
                    order: getNumber<number>(ref, 'order')
                  })) : [],
                  teamQuestionResponses: teamQuestionResponses ? teamQuestionResponses.map(q => ({
                    response: getString(q, 'response'),
                    order: getNumber<number>(q, 'order')
                  })) : [],
                  session: request.session,
                  attachments: validatedAttachments.value,
                  organization: organization || undefined
                })
              });
            }

            if (!validatedOrganization.value) {
              return invalid({
                proposal: adt('edit' as const, {
                  organization: ['An organization must be specified prior to submitting.']
                })
              });
            }

            const validatedInceptionPhase = await validateSWUProposalPhase(connection, inceptionPhase, swuOpportunity.inceptionPhase || null, validatedOrganization.value.id);
            const validatedPrototypePhase = await validateSWUProposalPhase(connection, prototypePhase, swuOpportunity.prototypePhase || null, validatedOrganization.value.id);
            const validatedImplementationPhase = await validateSWUProposalPhase(connection, implementationPhase, swuOpportunity.implementationPhase, validatedOrganization.value.id);
            const validatedTeamQuestionResponses = proposalValidation.validateSWUProposalTeamQuestionResponses(teamQuestionResponses, swuOpportunity.teamQuestions);
            const validatedReferences = proposalValidation.validateSWUProposalReferences(references);
            // Validate that the total proposed cost does not exceed the max budget of the opportunity
            const validatedTotalProposedCost = proposalValidation.validateSWUProposalProposedCost(
              getValidValue(validatedInceptionPhase, null)?.proposedCost || 0,
              getValidValue(validatedPrototypePhase, null)?.proposedCost || 0,
              getValidValue(validatedImplementationPhase, null)?.proposedCost || 0,
              swuOpportunity.totalMaxBudget
            );
            // Validate that the set of proposed capabilities across team members satisfies the opportunity required capabilities
            const validatedProposalTeam = await validateSWUProposalTeam(
              connection,
              swuOpportunity,
              getValidValue(validatedInceptionPhase, null)?.members.map(m => m.member) || [],
              getValidValue(validatedPrototypePhase, null)?.members.map(m => m.member) || [],
              getValidValue(validatedImplementationPhase, null)?.members.map(m => m.member) || []
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
                } as UpdateEditValidationErrors)
              });
            }
          }
          case 'submit': {
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.Submitted, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // Validate draft proposal here to make sure it has everything
            if (!allValid([
              proposalValidation.validateSWUProposalTeamQuestionResponses(validatedSWUProposal.value.teamQuestionResponses, swuOpportunity.teamQuestions),
              proposalValidation.validateSWUProposalReferences(validatedSWUProposal.value.references),
              proposalValidation.validateSWUProposalProposedCost(
                validatedSWUProposal.value.inceptionPhase?.proposedCost || 0,
                validatedSWUProposal.value.prototypePhase?.proposedCost || 0,
                validatedSWUProposal.value.implementationPhase?.proposedCost || 0,
                swuOpportunity.totalMaxBudget
              ),
              await validateSWUProposalTeam(
                connection,
                swuOpportunity,
                validatedSWUProposal.value.inceptionPhase?.members.map(m => m.member.id) || [],
                validatedSWUProposal.value.prototypePhase?.members.map(m => m.member.id) || [],
                validatedSWUProposal.value.implementationPhase?.members.map(m => m.member.id) || []
              )
            ])) {
              return invalid({
                proposal: adt('submit' as const, ['This proposal could not be submitted for review because it is incomplete. Please edit, complete and save the form below before trying to submit it again.'])
              });
            }

            // Prior to submitting, re-check permissions and ensure organization is still SWU qualified
            const proposalOrganization = validatedSWUProposal.value.organization && getValidValue(await db.readOneOrganization(connection, validatedSWUProposal.value.organization.id, false, request.session), null);
            if (!proposalOrganization || !await permissions.submitSWUProposal(connection, request.session, proposalOrganization)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }

            // Ensure that all required phases have been provided
            if ((swuOpportunity.inceptionPhase && !validatedSWUProposal.value.inceptionPhase) ||
                (swuOpportunity.prototypePhase && !validatedSWUProposal.value.prototypePhase)) {
              return invalid({
                proposal: adt('submit' as const, ['A required phase is missing from this proposal.'])
              });
            }

            // Validate parts of phases that have not been validated yet (proposed cost and team members, dates are already validated)
            if (validatedSWUProposal.value.inceptionPhase) {
              const validatedInceptionCost = proposalValidation.validateSWUPhaseProposedCost(validatedSWUProposal.value.inceptionPhase.proposedCost, swuOpportunity.inceptionPhase?.maxBudget || 0);
              const validatedInceptionMembers = await validateSWUProposalTeamMembers(connection, validatedSWUProposal.value.inceptionPhase.members.map(member => {
                return {
                  ...member,
                  member: member.member.id
                };
              }), validatedSWUProposal.value.organization?.id || '');
              if (!allValid([validatedInceptionCost, validatedInceptionMembers])) {
                return invalid({
                  proposal: adt('submit' as const, ['The inception phase is incomplete or invalid.  This proposal could not be submitted.'])
                });
              }
            }

            if (validatedSWUProposal.value.prototypePhase) {
              const validatedPrototypeCost = proposalValidation.validateSWUPhaseProposedCost(validatedSWUProposal.value.prototypePhase.proposedCost, swuOpportunity.prototypePhase?.maxBudget || 0);
              const validatedPrototypeMembers = await validateSWUProposalTeamMembers(connection, validatedSWUProposal.value.prototypePhase.members.map(member => {
                return {
                  ...member,
                  member: member.member.id
                };
              }), validatedSWUProposal.value.organization?.id || '');
              if (!allValid([validatedPrototypeCost, validatedPrototypeMembers])) {
                return invalid({
                  proposal: adt('submit' as const, ['The prototype phase is incomplete or invalid.  This proposal could not be submitted.'])
                });
              }
            }

            if (validatedSWUProposal.value.implementationPhase) {
              const validatedImplementationCost = proposalValidation.validateSWUPhaseProposedCost(validatedSWUProposal.value.implementationPhase.proposedCost, swuOpportunity.implementationPhase?.maxBudget || 0);
              const validatedImplementationMembers = await validateSWUProposalTeamMembers(connection, validatedSWUProposal.value.implementationPhase.members.map(member => {
                return {
                  ...member,
                  member: member.member.id
                };
              }), validatedSWUProposal.value.organization?.id || '');
              if (!allValid([validatedImplementationCost, validatedImplementationMembers])) {
                return invalid({
                  proposal: adt('submit' as const, ['The implementation phase is incomplete or invalid.  This proposal could not be submitted.'])
                });
              }
            }

            const validatedSubmissionNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedSubmissionNote)) {
              return invalid({ proposal: adt('submit' as const, validatedSubmissionNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('submit' as const, validatedSubmissionNote.value)
            } as ValidatedUpdateRequestBody);
          }
          case 'scoreQuestions': {
            if (![SWUProposalStatus.UnderReviewTeamQuestions, SWUProposalStatus.EvaluatedTeamQuestions].includes(validatedSWUProposal.value.status)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // The opportunity must be in team questions stage
            if (swuOpportunity.status !== SWUOpportunityStatus.EvaluationTeamQuestions) {
              return invalid({
                permissions: ['The opportunity is not in the correct stage of evaluation to perform that action.']
              });
            }
            const validatedQuestionsScore = proposalValidation.validateTeamQuestionScores(request.body.value, swuOpportunity.teamQuestions);
            if (isInvalid(validatedQuestionsScore)) {
              return invalid({
                proposal: adt('scoreQuestions' as const, getInvalidValue(validatedQuestionsScore, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('scoreQuestions' as const, validatedQuestionsScore.value)
            } as ValidatedUpdateRequestBody);
          }
          case 'screenInToCodeChallenge': {
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.UnderReviewCodeChallenge, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // The opportunity must be in team question stage still
            if (swuOpportunity.status !== SWUOpportunityStatus.EvaluationTeamQuestions) {
              return invalid({
                permissions: ['The opportunity is not in the correct stage of evaluation to perform that action.']
              });
            }
            const validatedScreenInCCNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedScreenInCCNote)) {
              return invalid({
                proposal: adt('screenInToCodeChallenge' as const, getInvalidValue(validatedScreenInCCNote, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('screenInToCodeChallenge' as const, validatedScreenInCCNote.value)
            });
          }
          case 'screenOutFromCodeChallenge': {
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.EvaluatedTeamQuestions, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // The opportunity must be in the team questions or code challenge stage
            if (![SWUOpportunityStatus.EvaluationTeamQuestions, SWUOpportunityStatus.EvaluationCodeChallenge].includes(swuOpportunity.status)) {
              return invalid({
                permissions: ['The opportunity is not in the correct stage of evaluation to perform that action.']
              });
            }
            const validatedScreenOutCCNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedScreenOutCCNote)) {
              return invalid({
                proposal: adt('screenOutFromCodeChallenge' as const, getInvalidValue(validatedScreenOutCCNote, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('screenOutFromCodeChallenge' as const, validatedScreenOutCCNote.value)
            });
          }
          case 'scoreCodeChallenge': {
            if (![SWUProposalStatus.UnderReviewCodeChallenge, SWUProposalStatus.EvaluatedCodeChallenge].includes(validatedSWUProposal.value.status)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // The opportunity must be in code challenge stage
            if (swuOpportunity.status !== SWUOpportunityStatus.EvaluationCodeChallenge) {
              return invalid({
                permissions: ['The opportunity is not in the correct stage of evaluation to perform that action.']
              });
            }
            const validatedCodeChallengeScore = proposalValidation.validateCodeChallengeScore(request.body.value);
            if (isInvalid(validatedCodeChallengeScore)) {
              return invalid({
                proposal: adt('scoreCodeChallenge' as const, getInvalidValue(validatedCodeChallengeScore, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('scoreCodeChallenge' as const, validatedCodeChallengeScore.value)
            } as ValidatedUpdateRequestBody);
          }
          case 'screenInToTeamScenario': {
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.UnderReviewTeamScenario, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // The opportunity must be in code challenge stage still
            if (swuOpportunity.status !== SWUOpportunityStatus.EvaluationCodeChallenge) {
              return invalid({
                permissions: ['The opportunity is not in the correct stage of evaluation to perform that action.']
              });
            }
            const validatedScreenInTSNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedScreenInTSNote)) {
              return invalid({
                proposal: adt('screenInToTeamScenario' as const, getInvalidValue(validatedScreenInTSNote, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('screenInToTeamScenario' as const, validatedScreenInTSNote.value)
            });
          }
          case 'screenOutFromTeamScenario': {
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.EvaluatedCodeChallenge, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // The opportunity must be in the code challenge or team scenario stage
            if (![SWUOpportunityStatus.EvaluationCodeChallenge, SWUOpportunityStatus.EvaluationTeamScenario].includes(swuOpportunity.status)) {
              return invalid({
                permissions: ['The opportunity is not in the correct stage of evaluation to perform that action.']
              });
            }
            const validatedScreenOutTSNote = proposalValidation.validateNote(request.body.value);
            if (isInvalid(validatedScreenOutTSNote)) {
              return invalid({
                proposal: adt('screenOutFromTeamScenario' as const, getInvalidValue(validatedScreenOutTSNote, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('screenOutFromTeamScenario' as const, validatedScreenOutTSNote.value)
            });
          }
          case 'scoreTeamScenario': {
            if (![SWUProposalStatus.UnderReviewTeamScenario, SWUProposalStatus.EvaluatedTeamScenario].includes(validatedSWUProposal.value.status)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            // The opportunity must be in team scenario stage
            if (swuOpportunity.status !== SWUOpportunityStatus.EvaluationTeamScenario) {
              return invalid({
                permissions: ['The opportunity is not in the correct stage of evaluation to perform that action.']
              });
            }
            const validatedTeamScenarioScore = proposalValidation.validateTeamScenarioScore(request.body.value);
            if (isInvalid(validatedTeamScenarioScore)) {
              return invalid({
                proposal: adt('scoreTeamScenario' as const, getInvalidValue(validatedTeamScenarioScore, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('scoreTeamScenario' as const, validatedTeamScenarioScore.value)
            } as ValidatedUpdateRequestBody);
          }
          case 'award': {
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.Awarded, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
             // The opportunity must be in team scenario stage
            if (swuOpportunity.status !== SWUOpportunityStatus.EvaluationTeamScenario) {
              return invalid({
                permissions: ['The opportunity is not in the correct stage of evaluation to perform that action.']
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
          }
          case 'disqualify': {
            if (!isValidStatusChange(validatedSWUProposal.value.status, SWUProposalStatus.Disqualified, request.session.user.type, swuOpportunity.proposalDeadline)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }
            const validatedDisqualifyNote = proposalValidation.validateDisqualificationReason(request.body.value);
            if (isInvalid(validatedDisqualifyNote)) {
              return invalid({
                proposal: adt('disqualify' as const, getInvalidValue(validatedDisqualifyNote, []))
              });
            }
            return valid({
              session: request.session,
              body: adt('disqualify' as const, validatedDisqualifyNote.value)
            } as ValidatedUpdateRequestBody);
          }
          case 'withdraw': {
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
          }
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
              // Notify of submission
              if (isValid(dbResult)) {
                swuProposalNotifications.handleSWUProposalSubmitted(connection, request.params.id, request.body.session);
              }
              break;
            case 'scoreQuestions':
              dbResult = await db.updateSWUProposalTeamQuestionScores(connection, request.params.id, body.value, session);
              break;
            case 'screenInToCodeChallenge':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.UnderReviewCodeChallenge, body.value, session);
              break;
            case 'screenOutFromCodeChallenge':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.EvaluatedTeamQuestions, body.value, session);
              break;
            case 'scoreCodeChallenge':
              dbResult = await db.updateSWUProposalCodeChallengeScore(connection, request.params.id, body.value, session);
              break;
            case 'screenInToTeamScenario':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.UnderReviewTeamScenario, body.value, session);
              break;
            case 'screenOutFromTeamScenario':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.EvaluatedCodeChallenge, body.value, session);
              break;
            case 'scoreTeamScenario':
              dbResult = await db.updateSWUProposalScenarioAndPriceScores(connection, request.params.id, body.value, session);
              break;
            case 'award':
              dbResult = await db.awardSWUProposal(connection, request.params.id, body.value, session);
              // Notify of award (also notifies unsuccessful proponents)
              if (isValid(dbResult)) {
                swuProposalNotifications.handleSWUProposalAwarded(connection, request.params.id, request.body.session);
              }
              break;
            case 'disqualify':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.Disqualified, body.value, session);
              // Notify of disqualification
              if (isValid(dbResult)) {
                swuProposalNotifications.handleSWUProposalDisqualified(connection, request.params.id, request.body.session);
              }
              break;
            case 'withdraw':
              dbResult = await db.updateSWUProposalStatus(connection, request.params.id, SWUProposalStatus.Withdrawn, body.value, session);
              if (isValid(dbResult)) {
                swuProposalNotifications.handleSWUProposalWithdrawn(connection, request.params.id, request.body.session);
              }
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
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        if (!permissions.isSignedIn(request.session) || !(await permissions.deleteSWUProposal(connection, request.session, request.params.id))) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const validatedSWUProposal = await validateSWUProposalId(connection, request.params.id, request.session);
        if (isInvalid(validatedSWUProposal)) {
          return invalid({ notFound: ['The specified proposal was not found.'] });
        }
        if (validatedSWUProposal.value.status !== SWUProposalStatus.Draft) {
          return invalid({ status: ['Only draft proposals can be deleted.'] });
        }
        return valid({
          proposal: validatedSWUProposal.value.id,
          session: request.session
        });
      },
      respond: wrapRespond({
        valid: async request => {
          const dbResult = await db.deleteSWUProposal(connection, request.body.proposal, request.body.session);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          return basicResponse(200, request.session, makeJsonResponseBody(dbResult.value));
        },
        invalid: async request => {
          return basicResponse(400, request.session, makeJsonResponseBody(request.body));
        }
      })
    };
  }
};

export default resource;
