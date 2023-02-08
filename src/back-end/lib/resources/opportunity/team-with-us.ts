import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import * as twuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/team-with-us";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import { validateAttachments } from "back-end/lib/validation";
import { get, omit } from "lodash";
import { addDays, getNumber, getString, getStringArray } from "shared/lib";
import { invalid } from "shared/lib/http";
import {
  CreateRequestBody as SharedCreateRequestBody,
  CreateTWUOpportunityStatus,
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors,
  CreateValidationErrors,
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import {
  allValid,
  getInvalidValue,
  getValidValue,
  isInvalid,
  mapValid,
  valid,
  validateUUID
} from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/team-with-us";
import * as genericValidation from "shared/lib/validation/opportunity/utility";

interface ValidatedCreateRequestBody
  extends Omit<
    TWUOpportunity,
    | "createdAt"
    | "updatedAt"
    | "createdBy"
    | "updatedBy"
    | "status"
    | "id"
    | "addenda"
    | "history"
    | "publishedAt"
    | "subscribed"
    | "resourceQuestions"
    | "challengeEndDate"
  > {
  status: CreateTWUOpportunityStatus;
  session: AuthenticatedSession;
  resourceQuestions: CreateTWUResourceQuestionBody[];
}

type CreateRequestBody = Omit<SharedCreateRequestBody, "status"> & {
  status: string;
};

/**
 * Defined for use in the router
 *
 * @see {@link resource}
 */
const routeNamespace = "opportunities/team-with-us";

/**
 * Reads one TWU opportunity from the database.
 *
 * @param connection - database connection
 * @returns - a response code, and a value
 */
const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<TWUOpportunity | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: TWUOpportunity | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    // Validate the provided id
    const validatedId = validateUUID(request.params.id);
    if (isInvalid(validatedId)) {
      return respond(400, validatedId.value);
    }
    const dbResult = await db.readOneTWUOpportunity(
      connection,
      validatedId.value,
      request.session
    );
    if (isInvalid(dbResult)) {
      return respond(503, [db.ERROR_MESSAGE]);
    }
    if (!dbResult.value) {
      return respond(404, ["Opportunity not found."]);
    }
    return respond(200, dbResult.value);
  });
};

/**
 * Creates a new Team With Us Opportunity.
 *
 * @remarks
 *
 * Handles both the request and response. Sequence is to parse
 * the request, validate fields, create the opportunity and
 * generate the response. It also triggers notifications (email)
 * in certain conditions, such as if the status of the opportunity
 * changes to publish.
 *
 *
 * @param connection - database connection
 * @returns - a response body that is valid or invalid
 */
const create: crud.Create<
  Session,
  db.Connection,
  CreateRequestBody,
  ValidatedCreateRequestBody,
  CreateValidationErrors
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request) {
      const body: unknown =
        request.body.tag === "json" ? request.body.value : {};
      return {
        title: getString(body, "title"),
        teaser: getString(body, "teaser"),
        remoteOk: get(body, "remoteOk"),
        remoteDesc: getString(body, "remoteDesc"),
        location: getString(body, "location"),
        mandatorySkills: getStringArray(body, "mandatorySkills"),
        optionalSkills: getStringArray(body, "optionalSkills"),
        serviceArea: getString(body, "serviceArea"),
        targetAllocation: getNumber(body, "targetAllocation"),
        description: getString(body, "description"),
        proposalDeadline: getString(body, "proposalDeadline"),
        assignmentDate: getString(body, "assignmentDate"),
        startDate: getString(body, "startDate"),
        completionDate: getString(body, "completionDate"),
        maxBudget: getNumber(body, "maxBudget"),
        questionsWeight: getNumber(body, "questionsWeight"),
        challengeWeight: getNumber(body, "challengeWeight"),
        priceWeight: getNumber(body, "priceWeight"),
        attachments: getStringArray(body, "attachments"),
        status: getString(body, "status"),
        resourceQuestions: get(body, "resourceQuestions")
      };
    },
    async validateRequestBody(request) {
      const {
        title,
        teaser,
        remoteOk,
        remoteDesc,
        location,
        mandatorySkills,
        optionalSkills,
        serviceArea,
        targetAllocation,
        description,
        proposalDeadline,
        assignmentDate,
        startDate,
        completionDate,
        maxBudget,
        questionsWeight,
        challengeWeight,
        priceWeight,
        attachments,
        status,
        resourceQuestions
      } = request.body;

      const validatedStatus =
        opportunityValidation.validateCreateTWUOpportunityStatus(status);
      if (isInvalid(validatedStatus)) {
        return invalid({
          status: validatedStatus.value
        });
      }

      if (
        !permissions.createTWUOpportunity(
          request.session,
          validatedStatus.value
        ) ||
        !permissions.isSignedIn(request.session)
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const session: AuthenticatedSession = request.session;

      // Validate attachments for all opportunity statuses
      const validatedAttachments = await validateAttachments(
        connection,
        attachments
      );
      if (isInvalid<string[][]>(validatedAttachments)) {
        return invalid({
          attachments: validatedAttachments.value
        });
      }

      const now = new Date();
      const validatedProposalDeadline =
        opportunityValidation.validateProposalDeadline(proposalDeadline);
      const validatedAssignmentDate =
        genericValidation.validateDateFormatMinMax(
          assignmentDate,
          getValidValue(validatedProposalDeadline, now)
        );
      // Validate phase start/completion dates now so that we can coerce to defaults for draft
      const validatedStartDate = genericValidation.validateDateFormatMinMax(
        startDate,
        getValidValue(validatedAssignmentDate, now)
      );
      const validatedCompletionDate = mapValid(
        genericValidation.validateCompletionDate(
          completionDate,
          getValidValue(validatedStartDate, now)
        ),
        (v) => v || null
      );
      // Do not validate other fields if the opportunity a draft
      if (validatedStatus.value === TWUOpportunityStatus.Draft) {
        const defaultDate = addDays(new Date(), 14);
        return valid({
          ...request.body,
          session,
          status: validatedStatus.value,
          attachments: validatedAttachments.value,
          resourceQuestions: resourceQuestions
            ? resourceQuestions.map((v) => ({
                question: getString(v, "question"),
                guideline: getString(v, "guideline"),
                score: getNumber(v, "score"),
                wordLimit: getNumber(v, "wordLimit"),
                order: getNumber(v, "order")
              }))
            : [],
          // Coerce validated dates to default values
          proposalDeadline: getValidValue(
            validatedProposalDeadline,
            defaultDate
          ),
          assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
          startDate: getValidValue(validatedStartDate, defaultDate),
          completionDate: getValidValue(validatedCompletionDate, defaultDate)
        });
      }

      const validatedTitle = genericValidation.validateTitle(title);
      const validatedTeaser = genericValidation.validateTeaser(teaser);
      const validatedRemoteOk = genericValidation.validateRemoteOk(remoteOk);
      const validatedRemoteDesc = genericValidation.validateRemoteDesc(
        remoteDesc,
        getValidValue(validatedRemoteOk, false)
      );
      const validatedLocation = genericValidation.validateLocation(location);
      const validatedMaxBudget =
        opportunityValidation.validateMaxBudget(maxBudget);
      const validatedMandatorySkills =
        genericValidation.validateMandatorySkills(mandatorySkills);
      const validatedOptionalSkills =
        opportunityValidation.validateOptionalSkills(optionalSkills);
      const validatedServiceArea =
        opportunityValidation.validateServiceArea(serviceArea);
      const validatedTargetAllocation =
        opportunityValidation.validateTargetAllocation(targetAllocation);
      const validatedDescription =
        genericValidation.validateDescription(description);
      const validatedQuestionsWeight =
        opportunityValidation.validateQuestionsWeight(questionsWeight);
      const validatedChallengeWeight =
        opportunityValidation.validateChallengeWeight(challengeWeight);
      const validatedPriceWeight =
        opportunityValidation.validatePriceWeight(priceWeight);
      const validatedResourceQuestions =
        opportunityValidation.validateResourceQuestions(resourceQuestions);

      if (
        allValid([
          validatedTitle,
          validatedTeaser,
          validatedRemoteOk,
          validatedRemoteDesc,
          validatedLocation,
          validatedMaxBudget,
          validatedMandatorySkills,
          validatedOptionalSkills,
          validatedServiceArea,
          validatedTargetAllocation,
          validatedDescription,
          validatedQuestionsWeight,
          validatedChallengeWeight,
          validatedPriceWeight,
          validatedResourceQuestions,
          validatedProposalDeadline,
          validatedAssignmentDate,
          validatedStartDate,
          validatedCompletionDate,
          validatedAttachments,
          validatedStatus
        ])
      ) {
        // Ensure that score weights total 100%
        if (
          getValidValue(validatedQuestionsWeight, 0) +
            getValidValue(validatedChallengeWeight, 0) +
            getValidValue(validatedPriceWeight, 0) !==
          100
        ) {
          return invalid({
            scoreWeights: ["The scoring weights must total 100%."]
          });
        }

        return valid({
          session,
          title: validatedTitle.value,
          teaser: validatedTeaser.value,
          remoteOk: validatedRemoteOk.value,
          remoteDesc: validatedRemoteDesc.value,
          location: validatedLocation.value,
          maxBudget: validatedMaxBudget.value,
          mandatorySkills: validatedMandatorySkills.value,
          optionalSkills: validatedOptionalSkills.value,
          serviceArea: validatedServiceArea.value,
          targetAllocation: validatedTargetAllocation.value,
          description: validatedDescription.value,
          questionsWeight: validatedQuestionsWeight.value,
          challengeWeight: validatedChallengeWeight.value,
          priceWeight: validatedPriceWeight.value,
          resourceQuestions: validatedResourceQuestions.value,
          proposalDeadline: validatedProposalDeadline.value,
          assignmentDate: validatedAssignmentDate.value,
          startDate: validatedStartDate.value,
          completionDate: validatedCompletionDate.value,
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
          maxBudget: getInvalidValue(validatedMaxBudget, undefined),
          mandatorySkills: getInvalidValue<string[][], undefined>(
            validatedMandatorySkills,
            undefined
          ),
          optionalSkills: getInvalidValue<string[][], undefined>(
            validatedOptionalSkills,
            undefined
          ),
          serviceArea: getInvalidValue(validatedServiceArea, undefined),
          targetAllocation: getInvalidValue(
            validatedTargetAllocation,
            undefined
          ),
          description: getInvalidValue(validatedDescription, undefined),
          questionsWeight: getInvalidValue(validatedQuestionsWeight, undefined),
          challengeWeight: getInvalidValue(validatedChallengeWeight, undefined),
          priceWeight: getInvalidValue(validatedPriceWeight, undefined),
          resourceQuestions: getInvalidValue<
            CreateTWUResourceQuestionValidationErrors[],
            undefined
          >(validatedResourceQuestions, undefined),
          proposalDeadline: getInvalidValue(
            validatedProposalDeadline,
            undefined
          ),
          assignmentDate: getInvalidValue(validatedAssignmentDate, undefined),
          startDate: getInvalidValue(validatedStartDate, undefined),
          completionDate: getInvalidValue(validatedCompletionDate, undefined)
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<TWUOpportunity>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createTWUOpportunity(
          connection,
          omit(request.body, "session"),
          request.body.session
        );
        if (isInvalid(dbResult)) {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
        // If submitted for review, notify
        if (dbResult.value.status === TWUOpportunityStatus.UnderReview) {
          await twuOpportunityNotifications.handleTWUSubmittedForReview(
            connection,
            dbResult.value
          );
        }
        // If published, notify subscribed users
        if (dbResult.value.status === TWUOpportunityStatus.Published) {
          await twuOpportunityNotifications.handleTWUPublished(
            connection,
            dbResult.value,
            false
          );
        }
        return basicResponse(
          201,
          request.session,
          makeJsonResponseBody(dbResult.value)
        );
      },
      invalid: async (request) => {
        return basicResponse(
          400,
          request.session,
          makeJsonResponseBody(request.body)
        );
      }
    })
  };
};

/**
 * Resources defined here are exported for use in the router
 *
 * @see {@link createRouter} in 'src/back-end/index.ts'
 */
const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readOne,
  create
};

export default resource;
