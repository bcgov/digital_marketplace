import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  basicResponse,
  JsonResponseBody,
  makeJsonResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import {
  validateAttachments,
  validateTWUOpportunityId,
  validateTWUResources
} from "back-end/lib/validation";
import { get, omit } from "lodash";
import { addDays, getNumber, getString, getStringArray } from "shared/lib";
import { invalid } from "shared/lib/http";
import {
  CreateRequestBody as SharedCreateRequestBody,
  CreateTWUOpportunityStatus,
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors,
  CreateTWUResourceValidationErrors,
  CreateValidationErrors,
  DeleteValidationErrors,
  isValidStatusChange,
  TWUOpportunity,
  TWUOpportunitySlim,
  TWUOpportunityStatus,
  UpdateRequestBody,
  UpdateValidationErrors,
  CreateTWUResourceBody,
  ValidatedCreateTWUResourceBody
} from "shared/lib/resources/opportunity/team-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import {
  allValid,
  getInvalidValue,
  getValidValue,
  isInvalid,
  isValid,
  valid,
  validateUUID,
  Validation
} from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/team-with-us";
import * as genericValidation from "shared/lib/validation/opportunity/utility";
import * as twuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/team-with-us";
import { ADT, adt, Id } from "shared/lib/types";

/**
 * @remarks
 * serviceArea is intentionally declared as a number here, not an enum (backwards compatibility)
 */
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
    | "resources"
    | "resourceQuestions"
    | "challengeEndDate"
  > {
  resources: ValidatedCreateTWUResourceBody[];
  status: CreateTWUOpportunityStatus;
  session: AuthenticatedSession;
  resourceQuestions: CreateTWUResourceQuestionBody[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body:
    | ADT<"edit", ValidatedUpdateEditRequestBody>
    | ADT<"submitForReview", string>
    | ADT<"publish", string>
    | ADT<"startChallenge", string>
    | ADT<"suspend", string>
    | ADT<"cancel", string>
    | ADT<"addAddendum", string>;
}

/**
 * @remarks
 * serviceArea is intentionally a number here (via TWUResource[]), not an enum (backwards compatibility)
 * @see ValidatedCreateRequestBody
 */
type ValidatedUpdateEditRequestBody = Omit<
  ValidatedCreateRequestBody,
  "status" | "session"
>;

type CreateRequestBody = Omit<
  SharedCreateRequestBody,
  "status" | "resources"
> & {
  resources: CreateTWUResourceBody[];
  status: string;
};

type ValidatedDeleteRequestBody = Id;

/**
 * Defined for use in the router
 *
 * @see {@link resource}
 */
const routeNamespace = "opportunities/team-with-us";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<TWUOpportunitySlim[] | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: TWUOpportunitySlim[] | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    const dbResult = await db.readManyTWUOpportunities(
      connection,
      request.session
    );
    if (isInvalid(dbResult)) {
      return respond(503, [db.ERROR_MESSAGE]);
    }
    return respond(200, dbResult.value);
  });
};

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
  CreateRequestBody, // serviceArea = enum
  ValidatedCreateRequestBody, // serviceArea = number
  CreateValidationErrors // serviceArea = enum
> = (connection: db.Connection) => {
  return {
    // obtain values from each part of the incoming request body
    async parseRequestBody(request) {
      const body: unknown =
        request.body.tag === "json" ? request.body.value : {};
      return {
        title: getString(body, "title"),
        teaser: getString(body, "teaser"),
        remoteOk: get(body, "remoteOk"),
        remoteDesc: getString(body, "remoteDesc"),
        location: getString(body, "location"),
        resources: get(body, "resources"),
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
    // ensure the accuracy of values coming in from the request body
    async validateRequestBody(request) {
      const {
        title,
        teaser,
        remoteOk,
        remoteDesc,
        location,
        resources,
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

      const validatedResources = await validateTWUResources(
        connection,
        resources
      );
      if (isInvalid<CreateTWUResourceValidationErrors[]>(validatedResources)) {
        return invalid({
          resources: validatedResources.value
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
      const validatedCompletionDate =
        genericValidation.validateDateFormatMinMax(
          completionDate,
          getValidValue(validatedStartDate, now)
        );

      // Validate the following fields if the opportunity is saved as a draft
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
          completionDate: getValidValue(validatedCompletionDate, defaultDate),
          resources: validatedResources.value
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
          validatedResources,
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
          resources: validatedResources.value,
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
          resources: getInvalidValue<
            CreateTWUResourceValidationErrors[],
            undefined
          >(validatedResources, undefined),
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

const update: crud.Update<
  Session,
  db.Connection,
  UpdateRequestBody, // serviceArea = enum
  ValidatedUpdateRequestBody, // serviceArea = number
  UpdateValidationErrors // serviceArea = enum
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request) {
      const body = request.body.tag === "json" ? request.body.value : {};
      const tag: UpdateRequestBody["tag"] = get(body, "tag");
      switch (tag) {
        case "edit": {
          const value: unknown = get(body, "value");
          return adt("edit", {
            title: getString(value, "title"),
            teaser: getString(value, "teaser"),
            remoteOk: get(value, "remoteOk"),
            remoteDesc: getString(value, "remoteDesc"),
            location: getString(value, "location"),
            resources: get(value, "resources"),
            description: getString(value, "description"),
            proposalDeadline: getString(value, "proposalDeadline"),
            assignmentDate: getString(value, "assignmentDate"),
            startDate: getString(value, "startDate"),
            completionDate: getString(value, "completionDate"),
            maxBudget: getNumber<number>(value, "maxBudget"),
            questionsWeight: getNumber<number>(value, "questionsWeight"),
            challengeWeight: getNumber<number>(value, "challengeWeight"),
            priceWeight: getNumber<number>(value, "priceWeight"),
            attachments: getStringArray(value, "attachments"),
            resourceQuestions: get(value, "resourceQuestions")
          });
        }
        case "submitForReview":
          return adt("submitForReview", getString(body, "value"));
        case "publish":
          return adt("publish", getString(body, "value", ""));
        case "startChallenge":
          return adt("startChallenge", getString(body, "value", ""));
        case "suspend":
          return adt("suspend", getString(body, "value", ""));
        case "cancel":
          return adt("cancel", getString(body, "value", ""));
        case "addAddendum":
          return adt("addAddendum", getString(body, "value", ""));
      }
    },
    async validateRequestBody(request) {
      if (!request.body) {
        return invalid({ opportunity: adt("parseFailure" as const) });
      }

      const validatedTWUOpportunity = await validateTWUOpportunityId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedTWUOpportunity)) {
        return invalid({
          notFound: ["The specified opportunity does not exist."]
        });
      }

      const twuOpportunity = validatedTWUOpportunity.value;

      if (
        !(await permissions.editTWUOpportunity(
          connection,
          request.session,
          request.params.id
        )) ||
        !permissions.isSignedIn(request.session)
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      switch (request.body.tag) {
        case "edit": {
          const {
            title,
            teaser,
            remoteOk,
            remoteDesc,
            location,
            resources,
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
            resourceQuestions
          } = request.body.value;
          // TWU Opportunities can only be edited if they are in DRAFT, UNDER REVIEW, PUBLISHED, or SUSPENDED
          if (
            ![
              TWUOpportunityStatus.Draft,
              TWUOpportunityStatus.UnderReview,
              TWUOpportunityStatus.Published,
              TWUOpportunityStatus.Suspended
            ].includes(twuOpportunity.status)
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }

          // Attachments must be validated for both drafts and published opportunities.
          const validatedAttachments = await validateAttachments(
            connection,
            attachments
          );
          if (isInvalid<string[][]>(validatedAttachments)) {
            return invalid({
              opportunity: adt("edit" as const, {
                attachments: validatedAttachments.value
              })
            });
          }

          const validatedResources = await validateTWUResources(
            connection,
            resources
          );
          if (
            isInvalid<CreateTWUResourceValidationErrors[]>(validatedResources)
          ) {
            return invalid({
              opportunity: adt("edit" as const, {
                resources: validatedResources.value
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
          const validatedProposalDeadline =
            opportunityValidation.validateProposalDeadline(
              proposalDeadline,
              twuOpportunity
            );
          const validatedAssignmentDate =
            genericValidation.validateDateFormatMinMax(
              assignmentDate,
              getValidValue(validatedProposalDeadline, now)
            );
          const validatedStartDate = genericValidation.validateDateFormatMinMax(
            startDate,
            getValidValue(validatedAssignmentDate, now)
          );
          const validatedCompletionDate =
            genericValidation.validateDateFormatMinMax(
              completionDate,
              getValidValue(validatedStartDate, now)
            );

          // Only the following fields need validation if the opportunity is a draft.
          if (twuOpportunity.status === TWUOpportunityStatus.Draft) {
            const defaultDate = addDays(new Date(), 14);
            return valid({
              session: request.session,
              body: adt("edit" as const, {
                ...request.body.value,
                attachments: validatedAttachments.value,
                // Coerce validated dates to default values.
                proposalDeadline: getValidValue(
                  validatedProposalDeadline,
                  defaultDate
                ),
                assignmentDate: getValidValue(
                  validatedAssignmentDate,
                  defaultDate
                ),
                startDate: getValidValue(validatedStartDate, defaultDate),
                completionDate: getValidValue(
                  validatedCompletionDate,
                  defaultDate
                ),
                resources: validatedResources.value
              })
            });
          }

          const validatedTitle = genericValidation.validateTitle(title);
          const validatedTeaser = genericValidation.validateTeaser(teaser);
          const validatedRemoteOk =
            genericValidation.validateRemoteOk(remoteOk);
          const validatedRemoteDesc = genericValidation.validateRemoteDesc(
            remoteDesc,
            getValidValue(validatedRemoteOk, false)
          );
          const validatedLocation =
            genericValidation.validateLocation(location);
          const validatedMaxBudget =
            opportunityValidation.validateMaxBudget(maxBudget);
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
              validatedResources,
              validatedDescription,
              validatedQuestionsWeight,
              validatedChallengeWeight,
              validatedPriceWeight,
              validatedResourceQuestions,
              validatedProposalDeadline,
              validatedAssignmentDate,
              validatedStartDate,
              validatedCompletionDate,
              validatedAttachments
            ])
          ) {
            return valid({
              session: request.session,
              body: adt("edit" as const, {
                title: validatedTitle.value,
                teaser: validatedTeaser.value,
                remoteOk: validatedRemoteOk.value,
                remoteDesc: validatedRemoteDesc.value,
                location: validatedLocation.value,
                maxBudget: validatedMaxBudget.value,
                resources: validatedResources.value,
                description: validatedDescription.value,
                questionsWeight: validatedQuestionsWeight.value,
                challengeWeight: validatedChallengeWeight.value,
                priceWeight: validatedPriceWeight.value,
                resourceQuestions: validatedResourceQuestions.value,
                proposalDeadline: validatedProposalDeadline.value,
                assignmentDate: validatedAssignmentDate.value,
                startDate: validatedStartDate.value,
                completionDate: validatedCompletionDate.value,
                attachments: validatedAttachments.value
              })
            } as ValidatedUpdateRequestBody);
          } else {
            return invalid({
              opportunity: adt("edit" as const, {
                title: getInvalidValue(validatedTitle, undefined),
                teaser: getInvalidValue(validatedTeaser, undefined),
                remoteOk: getInvalidValue(validatedRemoteOk, undefined),
                remoteDesc: getInvalidValue(validatedRemoteDesc, undefined),
                location: getInvalidValue(validatedLocation, undefined),
                maxBudget: getInvalidValue(validatedMaxBudget, undefined),
                resources: getInvalidValue<
                  CreateTWUResourceValidationErrors[],
                  undefined
                >(validatedResources, undefined),
                description: getInvalidValue(validatedDescription, undefined),
                questionsWeight: getInvalidValue(
                  validatedQuestionsWeight,
                  undefined
                ),
                challengeWeight: getInvalidValue(
                  validatedChallengeWeight,
                  undefined
                ),
                priceWeight: getInvalidValue(validatedPriceWeight, undefined),
                resourceQuestions: getInvalidValue<
                  CreateTWUResourceQuestionValidationErrors[],
                  undefined
                >(validatedResourceQuestions, undefined),
                proposalDeadline: getInvalidValue(
                  validatedProposalDeadline,
                  undefined
                ),
                assignmentDate: getInvalidValue(
                  validatedAssignmentDate,
                  undefined
                ),
                startDate: getInvalidValue(validatedStartDate, undefined),
                completionDate: getInvalidValue(
                  validatedCompletionDate,
                  undefined
                )
              })
            });
          }
        }
        case "submitForReview": {
          if (
            !isValidStatusChange(
              twuOpportunity.status,
              TWUOpportunityStatus.UnderReview
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }

          // Perform validation to ensure it's ready for publishing
          if (
            !allValid([
              genericValidation.validateTitle(twuOpportunity.title),
              genericValidation.validateTeaser(twuOpportunity.teaser),
              genericValidation.validateRemoteOk(twuOpportunity.remoteOk),
              genericValidation.validateRemoteDesc(
                twuOpportunity.remoteDesc,
                twuOpportunity.remoteOk
              ),
              genericValidation.validateLocation(twuOpportunity.location),
              opportunityValidation.validateMaxBudget(twuOpportunity.maxBudget),
              genericValidation.validateDescription(twuOpportunity.description),
              opportunityValidation.validateQuestionsWeight(
                twuOpportunity.questionsWeight
              ),
              opportunityValidation.validateChallengeWeight(
                twuOpportunity.challengeWeight
              ),
              opportunityValidation.validatePriceWeight(
                twuOpportunity.priceWeight
              ),
              opportunityValidation.validateResourceQuestions(
                twuOpportunity.resourceQuestions
              )
            ])
          ) {
            return invalid({
              opportunity: adt("submitForReview" as const, [
                "This opportunity could not be submitted for review because it is incomplete. Please edit, complete and save the form below before trying to publish it again."
              ])
            });
          }

          const validatedSubmitNote = opportunityValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedSubmitNote)) {
            return invalid({
              opportunity: adt(
                "submitForReview" as const,
                validatedSubmitNote.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("submitForReview", validatedSubmitNote.value)
          } as ValidatedUpdateRequestBody);
        }
        case "publish": {
          if (
            !isValidStatusChange(
              twuOpportunity.status,
              TWUOpportunityStatus.Published
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Only admins can publish, so additional permissions check needed
          if (!permissions.publishTWUOpportunity(request.session)) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Opportunity will have been fully validated during review process, so no need to repeat
          const validatedPublishNote = opportunityValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedPublishNote)) {
            return invalid({
              opportunity: adt("publish" as const, validatedPublishNote.value)
            });
          }
          return valid({
            session: request.session,
            body: adt("publish", validatedPublishNote.value)
          });
        }
        case "startChallenge": {
          if (
            !isValidStatusChange(
              twuOpportunity.status,
              TWUOpportunityStatus.EvaluationChallenge
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Ensure there is at least one screened in proponent
          const screenedInCProponentCount = getValidValue(
            await db.countScreenedInTWUChallenge(connection, twuOpportunity.id),
            0
          );
          if (!screenedInCProponentCount) {
            return invalid({
              permissions: [
                "You must have at least one screened in proponent to start the Challenge."
              ]
            });
          }
          const validatedEvaluationChallengeNote =
            opportunityValidation.validateNote(request.body.value);
          if (isInvalid(validatedEvaluationChallengeNote)) {
            return invalid({
              opportunity: adt(
                "startChallenge" as const,
                validatedEvaluationChallengeNote.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("startChallenge", validatedEvaluationChallengeNote.value)
          });
        }
        case "suspend": {
          if (
            !isValidStatusChange(
              twuOpportunity.status,
              TWUOpportunityStatus.Suspended
            ) ||
            !permissions.suspendTWUOpportunity(request.session)
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          const validatedSuspendNote = opportunityValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedSuspendNote)) {
            return invalid({
              opportunity: adt("suspend" as const, validatedSuspendNote.value)
            });
          }
          return valid({
            session: request.session,
            body: adt("suspend", validatedSuspendNote.value)
          } as ValidatedUpdateRequestBody);
        }
        case "cancel": {
          if (
            !isValidStatusChange(
              twuOpportunity.status,
              TWUOpportunityStatus.Canceled
            ) ||
            !permissions.cancelTWUOpportunity(request.session)
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          const validatedCancelNote = opportunityValidation.validateNote(
            request.body.value
          );
          if (isInvalid(validatedCancelNote)) {
            return invalid({
              opportunity: adt("cancel" as const, validatedCancelNote.value)
            });
          }
          return valid({
            session: request.session,
            body: adt("cancel", validatedCancelNote.value)
          } as ValidatedUpdateRequestBody);
        }
        case "addAddendum": {
          if (
            twuOpportunity.status === TWUOpportunityStatus.Draft ||
            !(await permissions.addTWUAddendum(
              connection,
              request.session,
              twuOpportunity.id
            ))
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          const validatedAddendumText =
            opportunityValidation.validateAddendumText(request.body.value);
          if (isInvalid(validatedAddendumText)) {
            return invalid({
              opportunity: adt(
                "addAddendum" as const,
                validatedAddendumText.value
              )
            });
          }
          return valid({
            session: request.session,
            body: adt("addAddendum", validatedAddendumText.value)
          } as ValidatedUpdateRequestBody);
        }

        default:
          return invalid({ opportunity: adt("parseFailure" as const) });
      }
    },
    respond: wrapRespond({
      valid: async (request) => {
        let dbResult: Validation<TWUOpportunity, null>;
        const { session, body } = request.body;
        const doNotNotify = [
          TWUOpportunityStatus.Draft,
          TWUOpportunityStatus.Suspended,
          TWUOpportunityStatus.Canceled
        ];
        switch (body.tag) {
          case "edit":
            dbResult = await db.updateTWUOpportunityVersion(
              connection,
              { ...body.value, id: request.params.id },
              session
            );
            /**
             * Notify all subscribed users on the opportunity of the update
             * (only if not draft or suspended status)
             */
            if (
              isValid(dbResult) &&
              !Object.values(doNotNotify).includes(dbResult.value.status)
            ) {
              twuOpportunityNotifications.handleTWUUpdated(
                connection,
                dbResult.value
              );
            }
            break;
          case "submitForReview":
            dbResult = await db.updateTWUOpportunityStatus(
              connection,
              request.params.id,
              TWUOpportunityStatus.UnderReview,
              body.value,
              session
            );
            //Notify of submission
            if (isValid(dbResult)) {
              twuOpportunityNotifications.handleTWUSubmittedForReview(
                connection,
                dbResult.value
              );
            }
            break;
          case "publish": {
            const existingOpportunity = getValidValue(
              await db.readOneTWUOpportunity(
                connection,
                request.params.id,
                session
              ),
              null
            );
            dbResult = await db.updateTWUOpportunityStatus(
              connection,
              request.params.id,
              TWUOpportunityStatus.Published,
              body.value,
              session
            );
            // Notify all users with notifications on of the new opportunity
            if (isValid(dbResult)) {
              twuOpportunityNotifications.handleTWUPublished(
                connection,
                dbResult.value,
                existingOpportunity?.status === TWUOpportunityStatus.Suspended
              );
            }
            break;
          }
          case "startChallenge":
            dbResult = await db.updateTWUOpportunityStatus(
              connection,
              request.params.id,
              TWUOpportunityStatus.EvaluationChallenge,
              body.value,
              session
            );
            break;
          case "suspend":
            dbResult = await db.updateTWUOpportunityStatus(
              connection,
              request.params.id,
              TWUOpportunityStatus.Suspended,
              body.value,
              session
            );
            // Notify subscribers of suspension
            if (isValid(dbResult)) {
              twuOpportunityNotifications.handleTWUSuspended(
                connection,
                dbResult.value
              );
            }
            break;
          case "cancel":
            dbResult = await db.updateTWUOpportunityStatus(
              connection,
              request.params.id,
              TWUOpportunityStatus.Canceled,
              body.value,
              session
            );
            // Notify subscribers of cancellation
            if (isValid(dbResult)) {
              twuOpportunityNotifications.handleTWUCancelled(
                connection,
                dbResult.value
              );
            }
            break;
          case "addAddendum":
            dbResult = await db.addTWUOpportunityAddendum(
              connection,
              request.params.id,
              body.value,
              session
            );
            /**
             * Notify all subscribed users on the opportunity of the update
             * unless it's been cancelled
             */
            if (
              isValid(dbResult) &&
              !Object.values(doNotNotify).includes(dbResult.value.status)
            ) {
              twuOpportunityNotifications.handleTWUUpdated(
                connection,
                dbResult.value
              );
            }
            break;
        }
        if (isInvalid(dbResult)) {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
        return basicResponse(
          200,
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
 * Deletes a TWU opportunity from the db. Conditions are that the opportunity
 * must be in "Draft" status. Admins can delete any opportunity in "Draft" status
 * and Government users can delete only their own.
 *
 * @param connection - a database connection
 */
const delete_: crud.Delete<
  Session,
  db.Connection,
  ValidatedDeleteRequestBody,
  DeleteValidationErrors
> = (connection: db.Connection) => {
  return {
    async validateRequestBody(request) {
      if (
        !(await permissions.deleteTWUOpportunity(
          connection,
          request.session,
          request.params.id
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const validatedTWUOpportunity = await validateTWUOpportunityId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedTWUOpportunity)) {
        return invalid({ notFound: ["Opportunity not found."] });
      }
      if (
        ![
          TWUOpportunityStatus.Draft,
          TWUOpportunityStatus.UnderReview
        ].includes(validatedTWUOpportunity.value.status)
      ) {
        return invalid({ permissions: [permissions.ERROR_MESSAGE] });
      }
      return valid(validatedTWUOpportunity.value.id);
    },
    respond: wrapRespond({
      valid: async (request) => {
        const dbResult = await db.deleteTWUOpportunity(
          connection,
          request.params.id,
          request.session
        );
        if (isInvalid(dbResult)) {
          return basicResponse(
            503,
            request.session,
            makeJsonResponseBody({ database: [db.ERROR_MESSAGE] })
          );
        }
        return basicResponse(
          200,
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
  readMany,
  create,
  update,
  delete: delete_
};

export default resource;
