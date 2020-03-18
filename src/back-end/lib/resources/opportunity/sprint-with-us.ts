import { invalid } from 'back-end/../shared/lib/http';
import * as crud from 'back-end/lib/crud';
import * as db from 'back-end/lib/db';
import { newSWUOpportunityPublished } from 'back-end/lib/mailer/notifications/opportunity/sprint-with-us';
import * as permissions from 'back-end/lib/permissions';
import { basicResponse, JsonResponseBody, makeJsonResponseBody, nullRequestBodyHandler, wrapRespond } from 'back-end/lib/server';
import { SupportedRequestBodies, SupportedResponseBodies } from 'back-end/lib/types';
import { validateAttachments } from 'back-end/lib/validation';
import { get, omit } from 'lodash';
import { addDays, getNumber, getString, getStringArray } from 'shared/lib';
import { FileRecord } from 'shared/lib/resources/file';
import { UpdateEditRequestBody } from 'shared/lib/resources/opportunity/code-with-us';
import { CreateRequestBody, CreateSWUOpportunityPhaseBody, CreateSWUOpportunityStatus, CreateSWUTeamQuestionBody, CreateValidationErrors, DeleteValidationErrors, SWUOpportunity, SWUOpportunitySlim, SWUOpportunityStatus, UpdateRequestBody, UpdateValidationErrors } from 'shared/lib/resources/opportunity/sprint-with-us';
import { AuthenticatedSession, Session } from 'shared/lib/resources/session';
import { ADT, Id } from 'shared/lib/types';
import { allValid, getInvalidValue, getValidValue, isInvalid, optional, valid, validateUUID } from 'shared/lib/validation';
import * as opportunityValidation from 'shared/lib/validation/opportunity/sprint-with-us';

interface ValidatedCreateSWUOpportunityPhaseBody extends Omit<CreateSWUOpportunityPhaseBody, 'startDate' | 'completionDate'> {
  startDate: Date;
  completionDate: Date;
}

interface ValidatedCreateRequestBody extends Omit<SWUOpportunity, 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'status' | 'id' | 'addenda' | 'history' | 'publishedAt' | 'subscribed' | 'inceptionPhase' | 'prototypePhase' | 'implementationPhase' | 'teamQuestions'> {
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
      | ADT<'evaluateCodeChallenge', string>
      | ADT<'evaluateTeamScenario', string>
      | ADT<'suspend', string>
      | ADT<'cancel', string>
      | ADT<'addAddendum', string>;
}

interface ValidatedUpdateEditRequestBody extends Omit<UpdateEditRequestBody, 'proposalDeadline' | 'assignmentDate' | 'attachments'> {
  proposalDeadline: Date;
  assignmentDate: Date;
  attachments: FileRecord[];
}

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

async function notifySWUPublished(connection: db.Connection, opportunity: SWUOpportunity): Promise<void> {
  const subscribedUsers = getValidValue(await db.readManyUsersNotificationsOn(connection), null) || [];
  await Promise.all(subscribedUsers.map(async user => await newSWUOpportunityPublished(user, opportunity)));
}

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
          minTeamMembers: getNumber(body, 'minTeamMembers'),
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

        const validatedProposalDeadline = opportunityValidation.validateProposalDeadline(proposalDeadline);
        const validatedAssignmentDate = opportunityValidation.validateAssignmentDate(assignmentDate, getValidValue(validatedProposalDeadline, new Date()));
        // Validate phase start/completion dates now so that we can coerce to defaults for draft
        const inceptionPhaseStartDate = getString(inceptionPhase || {}, 'startDate');
        const validatedInceptionPhaseStartDate = opportunityValidation.validateSWUOpportunityInceptionPhaseStartDate(inceptionPhaseStartDate, getValidValue(validatedAssignmentDate, new Date()));
        const inceptionPhaseCompletionDate = getString(inceptionPhase || {}, 'completionDate');
        const validatedInceptionPhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(inceptionPhaseCompletionDate, getValidValue(validatedInceptionPhaseStartDate, new Date()));
        const prototypePhaseStartDate = getString(prototypePhase || {}, 'startDate');
        const validatedPrototypePhaseStartDate = opportunityValidation.validateSWUOpportunityPrototypePhaseStartDate(prototypePhaseStartDate, getValidValue(validatedInceptionPhaseCompletionDate, new Date()));
        const prototypePhaseCompletionDate = getString(prototypePhase || {}, 'completionDate');
        const validatedPrototypePhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(prototypePhaseCompletionDate, getValidValue(validatedPrototypePhaseStartDate, new Date()));
        const implementationPhaseStartDate = getString(implementationPhase || {}, 'startDate');
        const validatedImplementationPhaseStartDate = opportunityValidation.validateSWUOpportunityImplementationPhaseStartDate(implementationPhaseStartDate, getValidValue(validatedPrototypePhaseCompletionDate, new Date()));
        const implementationPhaseCompletionDate = getString(implementationPhase || {}, 'completionDate');
        const validatedImplementationPhaseCompletionDate = opportunityValidation.validateSWUOpportunityPhaseCompletionDate(implementationPhaseCompletionDate, getValidValue(validatedImplementationPhaseStartDate, new Date()));

        // Do not validate other fields if the opportunity a draft
        if (validatedStatus.value === SWUOpportunityStatus.Draft) {
          const defaultDate = addDays(new Date(), 14);
          return valid({
            ...request.body,
            session,
            status: validatedStatus.value,
            attachments: validatedAttachments.value,
            // Coerce validated dates to default values
            proposalDeadline: getValidValue(validatedProposalDeadline, defaultDate),
            assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
            inceptionPhase: inceptionPhase ? {
              ...inceptionPhase,
              startDate: getValidValue(validatedInceptionPhaseStartDate, defaultDate),
              completionDate: getValidValue(validatedInceptionPhaseCompletionDate, defaultDate)
            } : undefined,
            prototypePhase: prototypePhase ? {
              ...prototypePhase,
              startDate: getValidValue(validatedPrototypePhaseStartDate, defaultDate),
              completionDate: getValidValue(validatedPrototypePhaseCompletionDate, defaultDate)
            } : undefined,
            implementationPhase: {
              ...implementationPhase,
              startDate: getValidValue(validatedImplementationPhaseStartDate, defaultDate),
              completionDate: getValidValue(validatedImplementationPhaseCompletionDate, defaultDate)
            }
          });
        }

        const validatedTitle = opportunityValidation.validateTitle(title);
        const validatedTeaser = opportunityValidation.validateTeaser(teaser);
        const validatedRemoteOk =  opportunityValidation.validateRemoteOk(remoteOk);
        const validatedRemoteDesc = opportunityValidation.validateRemoteDesc(remoteDesc);
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
        const validatedInceptionPhase = optional(inceptionPhase, v => opportunityValidation.validateSWUOpportunityInceptionPhase(v, getValidValue(validatedAssignmentDate, new Date())));
        const validatedPrototypePhase = optional(prototypePhase, v => opportunityValidation.validateSWUOpportunityPrototypePhase(v, getValidValue(validatedInceptionPhaseCompletionDate, new Date())));
        const validatedImplementationPhase = opportunityValidation.validateSWUOpportunityImplementationPhase(implementationPhase, getValidValue(validatedPrototypePhaseCompletionDate, new Date()));
        const validatedTeamQuestions = opportunityValidation.validateTeamQuestions(teamQuestions);

        // Ensure that score weights total 100%
        if (getValidValue(validatedQuestionsWeight, 0) +
            getValidValue(validatedCodeChallengeWeight, 0) +
            getValidValue(validatedTeamScenarioWeight, 0) +
            getValidValue(validatedPriceWeight, 0) !== 100) {
              return invalid({
                scoreWeights: ['The scoring weights must total 100%.']
              });
        }

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
          // If published, notify subscribed users
          if (dbResult.value.status === SWUOpportunityStatus.Published) {
            notifySWUPublished(connection, dbResult.value);
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
