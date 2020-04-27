import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import * as swuOpportunityNotifications from 'back-end/lib/mailer/notifications/opportunity/sprint-with-us';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAttachments, validateSWUOpportunityId } from 'back-end/lib/validation';
import { get, omit } from 'lodash';
import { addDays, getBoolean, getNumber, getString, getStringArray } from 'shared/lib';
import { invalid } from 'shared/lib/http';
import { CreateRequestBody, CreateSWUOpportunityPhaseBody, CreateSWUOpportunityStatus, CreateSWUTeamQuestionBody, CreateValidationErrors, DeleteValidationErrors, editableOpportunityStatuses, isValidStatusChange, SWUOpportunity, SWUOpportunitySlim, SWUOpportunityStatus, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/opportunity/sprint-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { ADT, adt, Id } from 'shared/lib/types';
import { allValid, getInvalidValue, getValidValue, isInvalid, isValid, optional, valid, validateUUID, Validation } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/opportunity/sprint-with-us';

interface ValidatedCreateSWUOpportunityPhaseBody extends Omit<CreateSWUOpportunityPhaseBody, 'startDate' | 'completionDate'> {
  startDate: Date;
  completionDate: Date;
}

interface ValidatedCreateRequestBody extends Omit<SWUOpportunity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'status' | 'id' | 'addenda' | 'history' | 'publishedAt' | 'subscribed' | 'inceptionPhase' | 'prototypePhase' | 'implementationPhase' | 'teamQuestions' | 'codeChallengeEndDate' | 'teamScenarioEndDate'> {
  status: CreateSWUOpportunityStatus;
  session: AuthenticatedSession;
  inceptionPhase?: ValidatedCreateSWUOpportunityPhaseBody;
  prototypePhase?: ValidatedCreateSWUOpportunityPhaseBody;
  implementationPhase: ValidatedCreateSWUOpportunityPhaseBody;
  teamQuestions: CreateSWUTeamQuestionBody[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body: ADT<'edit', ValidatedUpdateEditRequestBody>
      | ADT<'submitForReview', string>
      | ADT<'publish', string>
      | ADT<'startCodeChallenge', string>
      | ADT<'startTeamScenario', string>
      | ADT<'suspend', string>
      | ADT<'cancel', string>
      | ADT<'addAddendum', string>;
}

type ValidatedUpdateEditRequestBody = Omit<ValidatedCreateRequestBody, 'status' | 'session'>;

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
  routeNamespace: 'opportunities/sprint-with-us',

  readMany(connection) {
    return nullRequestBodyHandler<JsonResponseBody<SWUOpportunitySlim[] | string[]>, Session>(async request => {
      const respond = (code: number, body: SWUOpportunitySlim[] | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      const dbResult = await db.readManySWUOpportunities(connection, request.session);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    });
  },

  readOne(connection) {
    return nullRequestBodyHandler<JsonResponseBody<SWUOpportunity | string[]>, Session>(async request => {
      const respond = (code: number, body: SWUOpportunity | string[]) => basicResponse(code, request.session, makeJsonResponseBody(body));
      // Validate the provided id
      const validatedId = validateUUID(request.params.id);
      if (isInvalid(validatedId)) {
        return respond(400, validatedId.value);
      }
      const dbResult = await db.readOneSWUOpportunity(connection, validatedId.value, request.session);
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      if (!dbResult.value) {
        return respond(404, ['Opportunity not found.']);
      }
      return respond(200, dbResult.value);
    });
  },

  create(connection) {
    return {
      async parseRequestBody(request) {
        const body: unknown = request.body.tag === 'json' ? request.body.value : {};
        return {
          title: getString(body, 'title'),
          teaser: getString(body, 'teaser'),
          remoteOk: get(body, 'remoteOk'),
          remoteDesc: getString(body, 'remoteDesc'),
          location: getString(body, 'location'),
          totalMaxBudget: getNumber(body, 'totalMaxBudget'),
          minTeamMembers: getNumber<number | undefined>(body, 'minTeamMembers', undefined),
          mandatorySkills: getStringArray(body, 'mandatorySkills'),
          optionalSkills: getStringArray(body, 'optionalSkills'),
          description: getString(body, 'description'),
          proposalDeadline: getString(body, 'proposalDeadline'),
          assignmentDate: getString(body, 'assignmentDate'),
          questionsWeight: getNumber(body, 'questionsWeight'),
          codeChallengeWeight: getNumber(body, 'codeChallengeWeight'),
          scenarioWeight: getNumber(body, 'scenarioWeight'),
          priceWeight: getNumber(body, 'priceWeight'),
          attachments: getStringArray(body, 'attachments'),
          status: getString(body, 'status'),
          inceptionPhase: get(body, 'inceptionPhase'),
          prototypePhase: get(body, 'prototypePhase'),
          implementationPhase: get(body, 'implementationPhase'),
          teamQuestions: get(body, 'teamQuestions')
        };
      },
      async validateRequestBody(request) {
        const { title,
                teaser,
                remoteOk,
                remoteDesc,
                location,
                totalMaxBudget,
                minTeamMembers,
                mandatorySkills,
                optionalSkills,
                description,
                proposalDeadline,
                assignmentDate,
                questionsWeight,
                codeChallengeWeight,
                scenarioWeight,
                priceWeight,
                attachments,
                status,
                inceptionPhase,
                prototypePhase,
                implementationPhase,
                teamQuestions } = request.body;

        const validatedStatus = opportunityValidation.validateCreateSWUOpportunityStatus(status);
        if (isInvalid(validatedStatus)) {
          return invalid({
            status: validatedStatus.value
          });
        }

        if (!permissions.createSWUOpportunity(request.session, validatedStatus.value) || !permissions.isSignedIn(request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        const session: AuthenticatedSession = request.session;

        // Validate attachments for all opportunity statuses
        const validatedAttachments = await validateAttachments(connection, attachments);
        if (isInvalid(validatedAttachments)) {
          return invalid({
            attachments: validatedAttachments.value
          });
        }

        const now = new Date();
        const validatedProposalDeadline = opportunityValidation.validateProposalDeadline(proposalDeadline);
        const validatedAssignmentDate = opportunityValidation.validateAssignmentDate(assignmentDate, getValidValue(validatedProposalDeadline, now));
        // Validate phase start/completion dates now so that we can coerce to defaults for draft
        const inceptionPhaseStartDate = getString(inceptionPhase || {}, 'startDate');
        const validatedInceptionPhaseStartDate = opportunityValidation.validateSWUOpportunityInceptionPhaseStartDate(inceptionPhaseStartDate, getValidValue(validatedAssignmentDate, now));
        const inceptionPhaseCompletionDate = getString(inceptionPhase || {}, 'completionDate');
        const validatedInceptionPhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(inceptionPhaseCompletionDate, getValidValue(validatedInceptionPhaseStartDate, getValidValue(validatedAssignmentDate, now)));

        const prototypePhaseStartDate = getString(prototypePhase || {}, 'startDate');
        const validatedPrototypePhaseStartDate = opportunityValidation.validateSWUOpportunityPrototypePhaseStartDate(prototypePhaseStartDate, getValidValue(validatedInceptionPhaseCompletionDate, getValidValue(validatedAssignmentDate, now)));
        const prototypePhaseCompletionDate = getString(prototypePhase || {}, 'completionDate');
        const validatedPrototypePhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(prototypePhaseCompletionDate, getValidValue(validatedPrototypePhaseStartDate, getValidValue(validatedAssignmentDate, now)));

        const implementationPhaseStartDate = getString(implementationPhase || {}, 'startDate');
        const validatedImplementationPhaseStartDate = opportunityValidation.validateSWUOpportunityImplementationPhaseStartDate(implementationPhaseStartDate, getValidValue(validatedPrototypePhaseCompletionDate, getValidValue(validatedAssignmentDate, now)));
        const implementationPhaseCompletionDate = getString(implementationPhase || {}, 'completionDate');
        const validatedImplementationPhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(implementationPhaseCompletionDate, getValidValue(validatedImplementationPhaseStartDate, getValidValue(validatedAssignmentDate, now)));

        // Do not validate other fields if the opportunity a draft
        if (validatedStatus.value === SWUOpportunityStatus.Draft) {
          const defaultPhaseLength = 7;
          const defaultDate = addDays(new Date(), 14);
          return valid({
            title,
            teaser,
            remoteOk,
            remoteDesc,
            location,
            totalMaxBudget,
            minTeamMembers,
            mandatorySkills,
            optionalSkills,
            description,
            questionsWeight,
            codeChallengeWeight,
            scenarioWeight,
            priceWeight,
            session,
            status: validatedStatus.value,
            attachments: validatedAttachments.value,
            teamQuestions: teamQuestions ? teamQuestions.map(v => ({
              question: getString(v, 'question'),
              guideline: getString(v, 'guideline'),
              score: getNumber(v, 'score'),
              wordLimit: getNumber(v, 'wordLimit'),
              order: getNumber(v, 'order')
            })) : [],
            // Coerce validated dates to default values
            proposalDeadline: getValidValue(validatedProposalDeadline, defaultDate),
            assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
            inceptionPhase: inceptionPhase ? {
              requiredCapabilities: (get(inceptionPhase, 'requiredCapabilities') || []).map(v => ({
                capability: getString(v, 'capability'),
                fullTime: getBoolean(v, 'fullTime')
              })),
              maxBudget: getNumber<number>(inceptionPhase, 'maxBudget'),
              startDate: getValidValue(validatedInceptionPhaseStartDate, getValidValue(validatedAssignmentDate, defaultDate)),
              completionDate: getValidValue(validatedInceptionPhaseCompletionDate, addDays(getValidValue(validatedInceptionPhaseStartDate, getValidValue(validatedAssignmentDate, defaultDate)), defaultPhaseLength))
            } : undefined,
            prototypePhase: prototypePhase ? {
              requiredCapabilities: (get(prototypePhase, 'requiredCapabilities') || []).map(v => ({
                capability: getString(v, 'capability'),
                fullTime: getBoolean(v, 'fullTime')
              })),
              maxBudget: getNumber<number>(prototypePhase, 'maxBudget'),
              startDate: getValidValue(validatedPrototypePhaseStartDate, inceptionPhase ? getValidValue(validatedInceptionPhaseCompletionDate, getValidValue(validatedAssignmentDate, defaultDate)) : getValidValue(validatedAssignmentDate, defaultDate)),
              completionDate: getValidValue(validatedPrototypePhaseCompletionDate, addDays(getValidValue(validatedPrototypePhaseStartDate, getValidValue(validatedAssignmentDate, defaultDate)), defaultPhaseLength))
            } : undefined,
            implementationPhase: {
              requiredCapabilities: (get(implementationPhase, 'requiredCapabilities') || []).map(v => ({
                capability: getString(v, 'capability'),
                fullTime: getBoolean(v, 'fullTime')
              })),
              maxBudget: getNumber<number>(implementationPhase, 'maxBudget'),
              startDate: getValidValue(validatedImplementationPhaseStartDate, prototypePhase ? getValidValue(validatedPrototypePhaseCompletionDate, getValidValue(validatedAssignmentDate, defaultDate)) : getValidValue(validatedAssignmentDate, defaultDate)),
              completionDate: getValidValue(validatedImplementationPhaseCompletionDate, addDays(getValidValue(validatedImplementationPhaseStartDate, getValidValue(validatedAssignmentDate, defaultDate)), defaultPhaseLength))
            }
          });
        }

        const validatedTitle = opportunityValidation.validateTitle(title);
        const validatedTeaser = opportunityValidation.validateTeaser(teaser);
        const validatedRemoteOk =  opportunityValidation.validateRemoteOk(remoteOk);
        const validatedRemoteDesc = opportunityValidation.validateRemoteDesc(remoteDesc, getValidValue(validatedRemoteOk, false));
        const validatedLocation = opportunityValidation.validateLocation(location);
        const validatedTotalMaxBudget = opportunityValidation.validateTotalMaxBudget(totalMaxBudget);
        const validatedMinTeamMembers = opportunityValidation.validateMinimumTeamMembers(minTeamMembers);
        const validatedMandatorySkills = opportunityValidation.validateMandatorySkills(mandatorySkills);
        const validatedOptionalSkills = opportunityValidation.validateOptionalSkills(optionalSkills);
        const validatedDescription = opportunityValidation.validateDescription(description);
        const validatedQuestionsWeight = opportunityValidation.validateQuestionsWeight(questionsWeight);
        const validatedCodeChallengeWeight = opportunityValidation.validateCodeChallengeWeight(codeChallengeWeight);
        const validatedTeamScenarioWeight = opportunityValidation.validateTeamScenarioWeight(scenarioWeight);
        const validatedPriceWeight = opportunityValidation.validatePriceWeight(priceWeight);
        const validatedInceptionPhase = opportunityValidation.validateSWUOpportunityInceptionPhase(inceptionPhase, getValidValue(validatedAssignmentDate, new Date()));
        const validatedPrototypePhase = optional(prototypePhase, v => opportunityValidation.validateSWUOpportunityPrototypePhase(v, getValidValue(validatedInceptionPhaseCompletionDate, getValidValue(validatedAssignmentDate, new Date()))));
        const validatedImplementationPhase = opportunityValidation.validateSWUOpportunityImplementationPhase(implementationPhase, getValidValue(validatedPrototypePhaseCompletionDate, getValidValue(validatedAssignmentDate, new Date())));
        const validatedTeamQuestions = opportunityValidation.validateTeamQuestions(teamQuestions);

        if (allValid([
          validatedTitle,
          validatedTeaser,
          validatedRemoteOk,
          validatedRemoteDesc,
          validatedLocation,
          validatedTotalMaxBudget,
          validatedMinTeamMembers,
          validatedMandatorySkills,
          validatedOptionalSkills,
          validatedDescription,
          validatedQuestionsWeight,
          validatedCodeChallengeWeight,
          validatedTeamScenarioWeight,
          validatedPriceWeight,
          validatedInceptionPhase,
          validatedPrototypePhase,
          validatedImplementationPhase,
          validatedTeamQuestions,
          validatedProposalDeadline,
          validatedAssignmentDate,
          validatedAttachments,
          validatedStatus
        ])) {
          // Ensure that score weights total 100%
          if (getValidValue(validatedQuestionsWeight, 0) +
          getValidValue(validatedCodeChallengeWeight, 0) +
          getValidValue(validatedTeamScenarioWeight, 0) +
          getValidValue(validatedPriceWeight, 0) !== 100) {
            return invalid({
              scoreWeights: ['The scoring weights must total 100%.']
            });
          }

          // Ensure that if inception phase is defined, prototype phase must also be defined
          if (getValidValue(validatedInceptionPhase, undefined) && !getValidValue(validatedPrototypePhase, undefined)) {
            return invalid({
              phases: ['A prototype phase must follow an inception phase.']
            });
          }

          return valid({
            session,
            title: validatedTitle.value,
            teaser: validatedTeaser.value,
            remoteOk: validatedRemoteOk.value,
            remoteDesc: validatedRemoteDesc.value,
            location: validatedLocation.value,
            totalMaxBudget: validatedTotalMaxBudget.value,
            minTeamMembers: validatedMinTeamMembers.value,
            mandatorySkills: validatedMandatorySkills.value,
            optionalSkills: validatedOptionalSkills.value,
            description: validatedDescription.value,
            questionsWeight: validatedQuestionsWeight.value,
            codeChallengeWeight: validatedCodeChallengeWeight.value,
            scenarioWeight: validatedTeamScenarioWeight.value,
            priceWeight: validatedPriceWeight.value,
            inceptionPhase: validatedInceptionPhase.value,
            prototypePhase: validatedPrototypePhase.value,
            implementationPhase: validatedImplementationPhase.value,
            teamQuestions: validatedTeamQuestions.value,
            proposalDeadline: validatedProposalDeadline.value,
            assignmentDate: validatedAssignmentDate.value,
            attachments: validatedAttachments.value,
            status: validatedStatus.value
          } as ValidatedCreateRequestBody);
        } else {
          return invalid({
            title: getInvalidValue(validatedTitle, undefined),
            teaser: getInvalidValue(validatedTeaser, undefined),
            remoteOk: getInvalidValue(validatedRemoteOk, undefined),
            remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
            location: getInvalidValue(validatedLocation, undefined),
            totalMaxBudget: getInvalidValue(validatedTotalMaxBudget, undefined),
            minTeamMembers: getInvalidValue(validatedMinTeamMembers, undefined),
            mandatorySkills: getInvalidValue(validatedMandatorySkills, undefined),
            optionalSkills: getInvalidValue(validatedOptionalSkills, undefined),
            description: getInvalidValue(validatedDescription, undefined),
            questionsWeight: getInvalidValue(validatedQuestionsWeight, undefined),
            codeChallengeWeight: getInvalidValue(validatedCodeChallengeWeight, undefined),
            teamScenarioWeight: getInvalidValue(validatedTeamScenarioWeight, undefined),
            priceWeight: getInvalidValue(validatedPriceWeight, undefined),
            inceptionPhase: getInvalidValue(validatedInceptionPhase, undefined),
            prototypePhase: getInvalidValue(validatedPrototypePhase, undefined),
            implementationPhase: getInvalidValue(validatedImplementationPhase, undefined),
            teamQuestions: getInvalidValue(validatedTeamQuestions, undefined),
            proposalDeadline: getInvalidValue(validatedProposalDeadline, undefined),
            assignmentDate: getInvalidValue(validatedAssignmentDate, undefined)
          });
        }
      },
      respond: wrapRespond<ValidatedCreateRequestBody, CreateValidationErrors, JsonResponseBody<SWUOpportunity>, JsonResponseBody<CreateValidationErrors>, Session>({
        valid: (async request => {
          const dbResult = await db.createSWUOpportunity(connection, omit(request.body, 'session'), request.body.session);
          if (isInvalid(dbResult)) {
            return basicResponse(503, request.session, makeJsonResponseBody({ database: [db.ERROR_MESSAGE] }));
          }
          // If submitted for review, notify
          if (dbResult.value.status === SWUOpportunityStatus.UnderReview) {
            swuOpportunityNotifications.handleSWUSubmittedForReview(connection, dbResult.value);
          }
          // If published, notify subscribed users
          if (dbResult.value.status === SWUOpportunityStatus.Published) {
            swuOpportunityNotifications.handleSWUPublished(connection, dbResult.value, false);
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
              title: getString(value, 'title'),
              teaser: getString(value, 'teaser'),
              remoteOk: get(value, 'remoteOk'),
              remoteDesc: getString(value, 'remoteDesc'),
              location: getString(value, 'location'),
              totalMaxBudget: getNumber<number>(value, 'totalMaxBudget'),
              minTeamMembers: getNumber<number | undefined>(value, 'minTeamMembers', undefined),
              mandatorySkills: getStringArray(value, 'mandatorySkills'),
              optionalSkills: getStringArray(value, 'optionalSkills'),
              description: getString(value, 'description'),
              proposalDeadline: getString(value, 'proposalDeadline'),
              assignmentDate: getString(value, 'assignmentDate'),
              questionsWeight: getNumber<number>(value, 'questionsWeight'),
              codeChallengeWeight: getNumber<number>(value, 'codeChallengeWeight'),
              scenarioWeight: getNumber<number>(value, 'scenarioWeight'),
              priceWeight: getNumber<number>(value, 'priceWeight'),
              attachments: getStringArray(value, 'attachments'),
              inceptionPhase: get(value, 'inceptionPhase'),
              prototypePhase: get(value, 'prototypePhase'),
              implementationPhase: get(value, 'implementationPhase'),
              teamQuestions: get(value, 'teamQuestions')
            });
          case 'submitForReview':
            return adt('submitForReview', getString(body, 'value'));
          case 'publish':
            return adt('publish', getString(body, 'value'));
          case 'startCodeChallenge':
            return adt('startCodeChallenge', getString(body, 'value'));
          case 'startTeamScenario':
            return adt('startTeamScenario', getString(body, 'value'));
          case 'suspend':
            return adt('suspend', getString(body, 'value'));
          case 'cancel':
            return adt('cancel', getString(body, 'value'));
          case 'addAddendum':
            return adt('addAddendum', getString(body, 'value'));
          default:
            return null;
        }
      },
      async validateRequestBody(request) {
        if (!request.body) { return invalid({ opportunity: adt('parseFailure' as const) }); }

        const validatedSWUOpportunity = await validateSWUOpportunityId(connection, request.params.id, request.session);
        if (isInvalid(validatedSWUOpportunity)) {
          return invalid({ notFound: ['The specified opportunity does not exist.'] });
        }
        const swuOpportunity = validatedSWUOpportunity.value;

        if (!permissions.editSWUOpportunity(connection, request.session, request.params.id) || !permissions.isSignedIn(request.session)) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }

        switch (request.body.tag) {
          case 'edit':
            const { title,
                    teaser,
                    remoteOk,
                    remoteDesc,
                    location,
                    totalMaxBudget,
                    minTeamMembers,
                    mandatorySkills,
                    optionalSkills,
                    description,
                    proposalDeadline,
                    assignmentDate,
                    questionsWeight,
                    codeChallengeWeight,
                    scenarioWeight,
                    priceWeight,
                    attachments,
                    inceptionPhase,
                    prototypePhase,
                    implementationPhase,
                    teamQuestions } = request.body.value;

            if (!editableOpportunityStatuses.includes(swuOpportunity.status)) {
              return invalid({
                permissions: [permissions.ERROR_MESSAGE]
              });
            }

            // Attachments must be validated for draft opportunities, as well as published.
            const validatedAttachments = await validateAttachments(connection, attachments);
            if (isInvalid(validatedAttachments)) {
              return invalid({
                opportunity: adt('edit' as const, {
                  attachments: validatedAttachments.value
                })
              });
            }

            /**
             * If the existing proposal deadline is in the past,
             * updates should be validated against that deadline.
             * The exception to this rule is if the opportunity is
             * a draft, then the proposal deadline should be validated
             * against the current date.
             */
            const now = new Date();
            const validatedProposalDeadline = opportunityValidation.validateProposalDeadline(proposalDeadline, swuOpportunity);
            const validatedAssignmentDate = opportunityValidation.validateAssignmentDate(assignmentDate, getValidValue(validatedProposalDeadline, now));
            const inceptionPhaseStartDate = getString(inceptionPhase || {}, 'startDate');
            const validatedInceptionPhaseStartDate = opportunityValidation.validateSWUOpportunityInceptionPhaseStartDate(inceptionPhaseStartDate, getValidValue(validatedAssignmentDate, getValidValue(validatedAssignmentDate, now)));
            const inceptionPhaseCompletionDate = getString(inceptionPhase || {}, 'completionDate');
            const validatedInceptionPhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(inceptionPhaseCompletionDate, getValidValue(validatedInceptionPhaseStartDate, getValidValue(validatedAssignmentDate, now)));
            const prototypePhaseStartDate = getString(prototypePhase || {}, 'startDate');
            const validatedPrototypePhaseStartDate = opportunityValidation.validateSWUOpportunityPrototypePhaseStartDate(prototypePhaseStartDate, getValidValue(validatedInceptionPhaseCompletionDate, getValidValue(validatedAssignmentDate, now)));
            const prototypePhaseCompletionDate = getString(prototypePhase || {}, 'completionDate');
            const validatedPrototypePhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(prototypePhaseCompletionDate, getValidValue(validatedPrototypePhaseStartDate, getValidValue(validatedAssignmentDate, now)));
            const implementationPhaseStartDate = getString(implementationPhase || {}, 'startDate');
            const validatedImplementationPhaseStartDate = opportunityValidation.validateSWUOpportunityImplementationPhaseStartDate(implementationPhaseStartDate, getValidValue(validatedPrototypePhaseCompletionDate, getValidValue(validatedAssignmentDate, now)));
            const implementationPhaseCompletionDate = getString(implementationPhase || {}, 'completionDate');
            const validatedImplementationPhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(implementationPhaseCompletionDate, getValidValue(validatedImplementationPhaseStartDate, getValidValue(validatedAssignmentDate, now)));

            // Do not validate other fields if the opportunity a draft
            if (swuOpportunity.status === SWUOpportunityStatus.Draft) {
              const defaultPhaseLength = 7;
              const defaultDate = addDays(new Date(), 14);
              return valid({
                session: request.session,
                body: adt('edit' as const , {
                  title,
                  teaser,
                  remoteOk,
                  remoteDesc,
                  location,
                  totalMaxBudget,
                  minTeamMembers,
                  mandatorySkills,
                  optionalSkills,
                  description,
                  questionsWeight,
                  codeChallengeWeight,
                  scenarioWeight,
                  priceWeight,
                  teamQuestions: teamQuestions ? teamQuestions.map(v => ({
                    question: getString(v, 'question'),
                    guideline: getString(v, 'guideline'),
                    score: getNumber(v, 'score'),
                    wordLimit: getNumber(v, 'wordLimit'),
                    order: getNumber(v, 'order')
                  })) : [],
                  attachments: validatedAttachments.value,
                  // Coerce validated dates to default values
                  proposalDeadline: getValidValue(validatedProposalDeadline, defaultDate),
                  assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
                  inceptionPhase: inceptionPhase ? {
                    requiredCapabilities: (get(inceptionPhase, 'requiredCapabilities') || []).map(v => ({
                      capability: getString(v, 'capability'),
                      fullTime: getBoolean(v, 'fullTime')
                    })),
                    maxBudget: getNumber<number>(inceptionPhase, 'maxBudget'),
                    startDate: getValidValue(validatedInceptionPhaseStartDate, getValidValue(validatedAssignmentDate, defaultDate)),
                    completionDate: getValidValue(validatedInceptionPhaseCompletionDate, addDays(getValidValue(validatedInceptionPhaseStartDate, getValidValue(validatedAssignmentDate, defaultDate)), defaultPhaseLength))
                  } : undefined,
                  prototypePhase: prototypePhase ? {
                    requiredCapabilities: (get(prototypePhase, 'requiredCapabilities') || []).map(v => ({
                      capability: getString(v, 'capability'),
                      fullTime: getBoolean(v, 'fullTime')
                    })),
                    maxBudget: getNumber<number>(prototypePhase, 'maxBudget'),
                    startDate: getValidValue(validatedPrototypePhaseStartDate, inceptionPhase ? getValidValue(validatedInceptionPhaseCompletionDate, getValidValue(validatedAssignmentDate, defaultDate)) : getValidValue(validatedAssignmentDate, defaultDate)),
                    completionDate: getValidValue(validatedPrototypePhaseCompletionDate, addDays(getValidValue(validatedPrototypePhaseStartDate, getValidValue(validatedAssignmentDate, defaultDate)), defaultPhaseLength))
                  } : undefined,
                  implementationPhase: {
                    requiredCapabilities: (get(implementationPhase, 'requiredCapabilities') || []).map(v => ({
                      capability: getString(v, 'capability'),
                      fullTime: getBoolean(v, 'fullTime')
                    })),
                    maxBudget: getNumber<number>(implementationPhase, 'maxBudget'),
                    startDate: getValidValue(validatedImplementationPhaseStartDate, prototypePhase ? getValidValue(validatedPrototypePhaseCompletionDate, getValidValue(validatedAssignmentDate, defaultDate)) : getValidValue(validatedAssignmentDate, defaultDate)),
                    completionDate: getValidValue(validatedImplementationPhaseCompletionDate, addDays(getValidValue(validatedImplementationPhaseStartDate, getValidValue(validatedAssignmentDate, defaultDate)), defaultPhaseLength))
                  }
                })
              } as ValidatedUpdateRequestBody);
            }

            const validatedTitle = opportunityValidation.validateTitle(title);
            const validatedTeaser = opportunityValidation.validateTeaser(teaser);
            const validatedRemoteOk =  opportunityValidation.validateRemoteOk(remoteOk);
            const validatedRemoteDesc = opportunityValidation.validateRemoteDesc(remoteDesc, getValidValue(validatedRemoteOk, false));
            const validatedLocation = opportunityValidation.validateLocation(location);
            const validatedTotalMaxBudget = opportunityValidation.validateTotalMaxBudget(totalMaxBudget);
            const validatedMinTeamMembers = opportunityValidation.validateMinimumTeamMembers(minTeamMembers);
            const validatedMandatorySkills = opportunityValidation.validateMandatorySkills(mandatorySkills);
            const validatedOptionalSkills = opportunityValidation.validateOptionalSkills(optionalSkills);
            const validatedDescription = opportunityValidation.validateDescription(description);
            const validatedQuestionsWeight = opportunityValidation.validateQuestionsWeight(questionsWeight);
            const validatedCodeChallengeWeight = opportunityValidation.validateCodeChallengeWeight(codeChallengeWeight);
            const validatedTeamScenarioWeight = opportunityValidation.validateTeamScenarioWeight(scenarioWeight);
            const validatedPriceWeight = opportunityValidation.validatePriceWeight(priceWeight);
            const validatedInceptionPhase = opportunityValidation.validateSWUOpportunityInceptionPhase(inceptionPhase, getValidValue(validatedAssignmentDate, now));
            const validatedPrototypePhase = opportunityValidation.validateSWUOpportunityPrototypePhase(prototypePhase, getValidValue(validatedInceptionPhaseCompletionDate, getValidValue(validatedAssignmentDate, now)));
            const validatedImplementationPhase = opportunityValidation.validateSWUOpportunityImplementationPhase(implementationPhase, getValidValue(validatedPrototypePhaseCompletionDate, getValidValue(validatedAssignmentDate, now)));
            const validatedTeamQuestions = opportunityValidation.validateTeamQuestions(teamQuestions);

            if (allValid([
              validatedTitle,
              validatedTeaser,
              validatedRemoteOk,
              validatedRemoteDesc,
              validatedLocation,
              validatedTotalMaxBudget,
              validatedMinTeamMembers,
              validatedMandatorySkills,
              validatedOptionalSkills,
              validatedDescription,
              validatedQuestionsWeight,
              validatedCodeChallengeWeight,
              validatedTeamScenarioWeight,
              validatedPriceWeight,
              validatedInceptionPhase,
              validatedPrototypePhase,
              validatedImplementationPhase,
              validatedTeamQuestions,
              validatedProposalDeadline,
              validatedAssignmentDate,
              validatedAttachments
            ])) {

              // Ensure that score weights total 100%
              if (getValidValue(validatedQuestionsWeight, 0) +
              getValidValue(validatedCodeChallengeWeight, 0) +
              getValidValue(validatedTeamScenarioWeight, 0) +
              getValidValue(validatedPriceWeight, 0) !== 100) {
                return invalid({ opportunity: adt('edit' as const, {
                  scoreWeights: ['The scoring weights must total 100%.']
                })});
              }

              // Ensure that if inception phase is defined, prototype phase must also be defined
              if (getValidValue(validatedInceptionPhase, undefined) && !getValidValue(validatedPrototypePhase, undefined)) {
                return invalid({ opportunity: adt('edit' as const, {
                  phases: ['A prototype phase must follow an inception phase.']
                })});
              }

              return valid({
                session: request.session,
                body: adt('edit' as const, {
                  title: validatedTitle.value,
                  teaser: validatedTeaser.value,
                  remoteOk: validatedRemoteOk.value,
                  remoteDesc: validatedRemoteDesc.value,
                  location: validatedLocation.value,
                  totalMaxBudget: validatedTotalMaxBudget.value,
                  minTeamMembers: validatedMinTeamMembers.value,
                  mandatorySkills: validatedMandatorySkills.value,
                  optionalSkills: validatedOptionalSkills.value,
                  description: validatedDescription.value,
                  questionsWeight: validatedQuestionsWeight.value,
                  codeChallengeWeight: validatedCodeChallengeWeight.value,
                  scenarioWeight: validatedTeamScenarioWeight.value,
                  priceWeight: validatedPriceWeight.value,
                  inceptionPhase: validatedInceptionPhase.value,
                  prototypePhase: validatedPrototypePhase.value,
                  implementationPhase: validatedImplementationPhase.value,
                  teamQuestions: validatedTeamQuestions.value,
                  proposalDeadline: validatedProposalDeadline.value,
                  assignmentDate: validatedAssignmentDate.value,
                  attachments: validatedAttachments.value
                })
              } as ValidatedUpdateRequestBody);
            } else {
              return invalid({
                opportunity: adt('edit' as const, {
                  title: getInvalidValue(validatedTitle, undefined),
                  teaser: getInvalidValue(validatedTeaser, undefined),
                  remoteOk: getInvalidValue(validatedRemoteOk, undefined),
                  remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
                  location: getInvalidValue(validatedLocation, undefined),
                  totalMaxBudget: getInvalidValue(validatedTotalMaxBudget, undefined),
                  minTeamMembers: getInvalidValue(validatedMinTeamMembers, undefined),
                  mandatorySkills: getInvalidValue(validatedMandatorySkills, undefined),
                  optionalSkills: getInvalidValue(validatedOptionalSkills, undefined),
                  description: getInvalidValue(validatedDescription, undefined),
                  questionsWeight: getInvalidValue(validatedQuestionsWeight, undefined),
                  codeChallengeWeight: getInvalidValue(validatedCodeChallengeWeight, undefined),
                  teamScenarioWeight: getInvalidValue(validatedTeamScenarioWeight, undefined),
                  priceWeight: getInvalidValue(validatedPriceWeight, undefined),
                  inceptionPhase: getInvalidValue(validatedInceptionPhase, undefined),
                  prototypePhase: getInvalidValue(validatedPrototypePhase, undefined),
                  implementationPhase: getInvalidValue(validatedImplementationPhase, undefined),
                  teamQuestions: getInvalidValue(validatedTeamQuestions, undefined),
                  proposalDeadline: getInvalidValue(validatedProposalDeadline, undefined),
                  assignmentDate: getInvalidValue(validatedAssignmentDate, undefined)
                })
              });
            }
          case 'submitForReview':
            if (!isValidStatusChange(swuOpportunity.status, SWUOpportunityStatus.UnderReview)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            // Perform validation on draft to ensure it's ready for publishing
            if (!allValid([
              opportunityValidation.validateTitle(validatedSWUOpportunity.value.title),
              opportunityValidation.validateTeaser(validatedSWUOpportunity.value.teaser),
              opportunityValidation.validateRemoteOk(validatedSWUOpportunity.value.remoteOk),
              opportunityValidation.validateRemoteDesc(validatedSWUOpportunity.value.remoteDesc, validatedSWUOpportunity.value.remoteOk),
              opportunityValidation.validateLocation(validatedSWUOpportunity.value.location),
              opportunityValidation.validateTotalMaxBudget(validatedSWUOpportunity.value.totalMaxBudget),
              opportunityValidation.validateMinimumTeamMembers(validatedSWUOpportunity.value.minTeamMembers),
              opportunityValidation.validateMandatorySkills(validatedSWUOpportunity.value.mandatorySkills),
              opportunityValidation.validateOptionalSkills(validatedSWUOpportunity.value.optionalSkills),
              opportunityValidation.validateDescription(validatedSWUOpportunity.value.description),
              opportunityValidation.validateQuestionsWeight(validatedSWUOpportunity.value.questionsWeight),
              opportunityValidation.validateCodeChallengeWeight(validatedSWUOpportunity.value.codeChallengeWeight),
              opportunityValidation.validateTeamScenarioWeight(validatedSWUOpportunity.value.scenarioWeight),
              opportunityValidation.validatePriceWeight(validatedSWUOpportunity.value.priceWeight),
              opportunityValidation.validatePriceWeight(validatedSWUOpportunity.value.priceWeight),
              opportunityValidation.validateSWUOpportunityInceptionPhase(validatedSWUOpportunity.value.inceptionPhase, validatedSWUOpportunity.value.assignmentDate),
              opportunityValidation.validateSWUOpportunityPrototypePhase(validatedSWUOpportunity.value.prototypePhase, validatedSWUOpportunity.value.inceptionPhase?.completionDate || validatedSWUOpportunity.value.assignmentDate),
              opportunityValidation.validateSWUOpportunityImplementationPhase(validatedSWUOpportunity.value.implementationPhase, validatedSWUOpportunity.value.prototypePhase?.completionDate || validatedSWUOpportunity.value.assignmentDate)
            ])) {
              return invalid({
                opportunity: adt('submitForReview' as const, ['This opportunity could not be submitted for review because it is incomplete. Please edit, complete and save the form below before trying to publish it again.'])
              });
            }

            const validatedSubmitNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedSubmitNote)) {
              return invalid({ opportunity: adt('submitForReview' as const, validatedSubmitNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('submitForReview', validatedSubmitNote.value)
            } as ValidatedUpdateRequestBody);
          case 'publish':
            if (!isValidStatusChange(validatedSWUOpportunity.value.status, SWUOpportunityStatus.Published)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            // Only admins can publish, so additional permissions check needed
            if (!permissions.publishSWUOpportunity(request.session)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            // Opportunity will have been fully validated during review process, so no need to repeat
            const validatedPublishNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedPublishNote)) {
              return invalid({ opportunity: adt('publish' as const, validatedPublishNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('publish', validatedPublishNote.value)
            });
          case 'startCodeChallenge':
            if (!isValidStatusChange(validatedSWUOpportunity.value.status, SWUOpportunityStatus.EvaluationCodeChallenge)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            // Ensure there is at least one screened in proponent
            const screenedInCCProponentCount = getValidValue(await db.countScreenedInSWUCodeChallenge(connection, validatedSWUOpportunity.value.id), 0);
            if (!screenedInCCProponentCount) {
              return invalid({ permissions: ['You must have at least one screened in proponent to start the Code Challenge.'] });
            }
            const validatedEvaluationCodeChallengeNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedEvaluationCodeChallengeNote)) {
              return invalid({ opportunity: adt('startCodeChallenge' as const, validatedEvaluationCodeChallengeNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('startCodeChallenge', validatedEvaluationCodeChallengeNote.value)
            });
          case 'startTeamScenario':
            if (!isValidStatusChange(validatedSWUOpportunity.value.status, SWUOpportunityStatus.EvaluationTeamScenario)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            // Ensure there is at least one screened in proponent
            const screenedInTSProponentCount = getValidValue(await db.countScreenInSWUTeamScenario(connection, validatedSWUOpportunity.value.id), 0);
            if (!screenedInTSProponentCount) {
              return invalid({ permissions: ['You must have at least one screened in proponent to start the Team Scenario.'] });
            }
            const validatedEvaluationTeamScenarioNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedEvaluationTeamScenarioNote)) {
              return invalid({ opportunity: adt('startTeamScenario' as const, validatedEvaluationTeamScenarioNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('startTeamScenario', validatedEvaluationTeamScenarioNote.value)
            });
          case 'suspend':
            if (!isValidStatusChange(validatedSWUOpportunity.value.status, SWUOpportunityStatus.Suspended) || !permissions.suspendSWUOpportunity(request.session)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            const validatedSuspendNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedSuspendNote)) {
              return invalid({ opportunity: adt('suspend' as const, validatedSuspendNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('suspend', validatedSuspendNote.value)
            } as ValidatedUpdateRequestBody);
          case 'cancel':
            if (!isValidStatusChange(validatedSWUOpportunity.value.status, SWUOpportunityStatus.Canceled) || !permissions.cancelSWUOpportunity(request.session)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            const validatedCancelNote = opportunityValidation.validateNote(request.body.value);
            if (isInvalid(validatedCancelNote)) {
              return invalid({ opportunity: adt('cancel' as const, validatedCancelNote.value) });
            }
            return valid({
              session: request.session,
              body: adt('cancel', validatedCancelNote.value)
            } as ValidatedUpdateRequestBody);
          case 'addAddendum':
            if (validatedSWUOpportunity.value.status === SWUOpportunityStatus.Draft || !permissions.addSWUAddendum(request.session)) {
              return invalid({ permissions: [permissions.ERROR_MESSAGE] });
            }
            const validatedAddendumText = opportunityValidation.validateAddendumText(request.body.value);
            if (isInvalid(validatedAddendumText)) {
              return invalid({ opportunity: adt('addAddendum' as const, validatedAddendumText.value) });
            }
            return valid({
              session: request.session,
              body: adt('addAddendum', validatedAddendumText.value)
            } as ValidatedUpdateRequestBody);
          default:
            return invalid({ opportunity: adt('parseFailure' as const) });
        }
      },
      respond: wrapRespond({
        valid: async request => {
          let dbResult: Validation<SWUOpportunity, null>;
          const { session, body } = request.body;
          switch (body.tag) {
            case 'edit':
              dbResult = await db.updateSWUOpportunityVersion(connection, { ...body.value, id: request.params.id }, session);
              // Notify all subscribed users on the opportunity of the update (only if not draft status)
              if (isValid(dbResult) && dbResult.value.status !== SWUOpportunityStatus.Draft) {
                swuOpportunityNotifications.handleSWUUpdated(connection, dbResult.value);
              }
              break;
            case 'submitForReview':
              dbResult = await db.updateSWUOpportunityStatus(connection, request.params.id, SWUOpportunityStatus.UnderReview, body.value, session);
              //Notify of submission
              if (isValid(dbResult)) {
                swuOpportunityNotifications.handleSWUSubmittedForReview(connection, dbResult.value);
              }
              break;
            case 'publish':
              const existingOpportunity = getValidValue(await db.readOneSWUOpportunity(connection, request.params.id, session), null);
              dbResult = await db.updateSWUOpportunityStatus(connection, request.params.id, SWUOpportunityStatus.Published, body.value, session);
              // Notify all users with notifications on of the new opportunity
              if (isValid(dbResult)) {
                swuOpportunityNotifications.handleSWUPublished(connection, dbResult.value, existingOpportunity?.status === SWUOpportunityStatus.Suspended);
              }
              break;
            case 'startCodeChallenge':
              dbResult = await db.updateSWUOpportunityStatus(connection, request.params.id, SWUOpportunityStatus.EvaluationCodeChallenge, body.value, session);
              break;
            case 'startTeamScenario':
              dbResult = await db.updateSWUOpportunityStatus(connection, request.params.id, SWUOpportunityStatus.EvaluationTeamScenario, body.value, session);
              break;
            case 'suspend':
              dbResult = await db.updateSWUOpportunityStatus(connection, request.params.id, SWUOpportunityStatus.Suspended, body.value, session);
              // Notify all subscribed users of suspension
              if (isValid(dbResult)) {
                swuOpportunityNotifications.handleSWUSuspended(connection, dbResult.value);
              }
              break;
            case 'cancel':
              dbResult = await db.updateSWUOpportunityStatus(connection, request.params.id, SWUOpportunityStatus.Canceled, body.value, session);
              // Notify all subscribed users of cancellation
              if (isValid(dbResult)) {
                swuOpportunityNotifications.handleSWUCancelled(connection, dbResult.value);
              }
              break;
            case 'addAddendum':
              dbResult = await db.addSWUOpportunityAddendum(connection, request.params.id, body.value, session);
              // Notify all subscribed users on the opportunity of the addendum
              if (isValid(dbResult)) {
                swuOpportunityNotifications.handleSWUUpdated(connection, dbResult.value);
              }
              break;
          }
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
  },

  delete(connection) {
    return {
      async validateRequestBody(request) {
        const validatedSWUOpportunity = await validateSWUOpportunityId(connection, request.params.id, request.session);
        if (isInvalid(validatedSWUOpportunity)) {
          return invalid({ notFound: ['Opportunity not found.'] });
        }
        if (!(await permissions.deleteSWUOpportunity(connection, request.session, request.params.id, validatedSWUOpportunity.value.status))) {
          return invalid({
            permissions: [permissions.ERROR_MESSAGE]
          });
        }
        return valid(validatedSWUOpportunity.value.id);
      },
      respond: wrapRespond({
        valid: async request => {
          const dbResult = await db.deleteSWUOpportunity(connection, request.body, request.session);
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
