import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as cwuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/code-with-us";
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
  validateCWUOpportunityId
} from "back-end/lib/validation";
import { get, omit } from "lodash";
import { addDays, getNumber, getString, getStringArray } from "shared/lib";
import { FileRecord } from "shared/lib/resources/file";
import {
  CreateCWUOpportunityStatus,
  CreateRequestBody as SharedCreatedRequestBody,
  CreateValidationErrors,
  CWUOpportunity,
  CWUOpportunitySlim,
  CWUOpportunityStatus,
  DeleteValidationErrors,
  isValidStatusChange,
  UpdateEditRequestBody,
  UpdateRequestBody as SharedUpdateRequestBody,
  UpdateValidationErrors,
  UpdateWithNoteRequestBody
} from "shared/lib/resources/opportunity/code-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { adt, ADT, Id } from "shared/lib/types";
import {
  allValid,
  getInvalidValue,
  getValidValue,
  invalid,
  isInvalid,
  isValid,
  mapValid,
  valid,
  validateUUID,
  Validation
} from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/code-with-us";
import * as genericValidation from "shared/lib/validation/opportunity/utility";

export interface ValidatedCreateRequestBody
  extends Omit<
    CWUOpportunity,
    "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "id" | "addenda"
  > {
  status: CreateCWUOpportunityStatus;
  session: AuthenticatedSession;
}

interface ValidatedUpdateEditRequestBody
  extends Omit<
    UpdateEditRequestBody,
    | "proposalDeadline"
    | "assignmentDate"
    | "startDate"
    | "completionDate"
    | "attachments"
  > {
  proposalDeadline: Date;
  assignmentDate: Date;
  startDate: Date;
  completionDate: Date | null;
  attachments: FileRecord[];
}

interface ValidatedUpdateWithNoteRequestBody
  extends Omit<UpdateWithNoteRequestBody, "attachments"> {
  attachments: FileRecord[];
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body:
    | ADT<"edit", ValidatedUpdateEditRequestBody>
    | ADT<"submitForReview", string>
    | ADT<"publish", string>
    | ADT<"cancel", string>
    | ADT<"addAddendum", string>
    | ADT<"addNote", ValidatedUpdateWithNoteRequestBody>;
}

type ValidatedDeleteRequestBody = Id;

type CreateRequestBody = Omit<SharedCreatedRequestBody, "status"> & {
  status: string;
};

type UpdateRequestBody = SharedUpdateRequestBody | null;

const routeNamespace = "opportunities/code-with-us";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<CWUOpportunitySlim[] | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: CWUOpportunitySlim[] | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    const dbResult = await db.readManyCWUOpportunities(
      connection,
      request.session
    );
    if (isInvalid(dbResult)) {
      return respond(503, [db.ERROR_MESSAGE]);
    }
    return respond(200, dbResult.value);
  });
};

const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<CWUOpportunity | string[]>,
    Session
  >(async (request) => {
    const respond = (code: number, body: CWUOpportunity | string[]) =>
      basicResponse(code, request.session, makeJsonResponseBody(body));
    // Validate the provided id
    const validatedId = validateUUID(request.params.id);
    if (isInvalid(validatedId)) {
      return respond(400, validatedId.value);
    }
    const dbResult = await db.readOneCWUOpportunity(
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
        reward: getNumber(body, "reward"),
        skills: getStringArray(body, "skills"),
        description: getString(body, "description"),
        proposalDeadline: getString(body, "proposalDeadline"),
        assignmentDate: getString(body, "assignmentDate"),
        startDate: getString(body, "startDate"),
        completionDate: getString(body, "completionDate"),
        submissionInfo: getString(body, "submissionInfo"),
        acceptanceCriteria: getString(body, "acceptanceCriteria"),
        evaluationCriteria: getString(body, "evaluationCriteria"),
        attachments: getStringArray(body, "attachments"),
        status: getString(body, "status")
      };
    },
    async validateRequestBody(request) {
      if (
        !permissions.createCWUOpportunity(request.session) ||
        !permissions.isSignedIn(request.session)
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const session: AuthenticatedSession = request.session;

      const {
        title,
        teaser,
        remoteOk,
        remoteDesc,
        location,
        reward,
        skills,
        description,
        proposalDeadline,
        assignmentDate,
        startDate,
        completionDate,
        submissionInfo,
        acceptanceCriteria,
        evaluationCriteria,
        attachments
      } = request.body;

      const validatedStatus =
        opportunityValidation.validateCreateCWUOpportunityStatus(
          request.body.status
        );
      if (isInvalid(validatedStatus)) {
        return invalid({
          status: validatedStatus.value
        });
      }

      // Attachments must be validated for both drafts and published opportunities.
      const validatedAttachments = await validateAttachments(
        connection,
        attachments
      );
      if (isInvalid<string[][]>(validatedAttachments)) {
        return invalid({
          attachments: validatedAttachments.value
        });
      }

      const validatedProposalDeadline =
        opportunityValidation.validateProposalDeadline(proposalDeadline);
      const validatedAssignmentDate =
        genericValidation.validateDateFormatMinMax(
          assignmentDate,
          getValidValue(validatedProposalDeadline, new Date())
        );
      const validatedStartDate = genericValidation.validateDateFormatMinMax(
        startDate,
        getValidValue(validatedAssignmentDate, new Date())
      );
      const validatedCompletionDate = mapValid(
        genericValidation.validateDateFormatMinMaxOrUndefined(
          completionDate,
          getValidValue(validatedStartDate, new Date())
        ),
        (v) => v || null
      );

      // Do not validate other fields if the opportunity is a draft.
      if (validatedStatus.value === CWUOpportunityStatus.Draft) {
        const defaultDate = addDays(new Date(), 14);
        return valid({
          ...request.body,
          session,
          status: validatedStatus.value,
          attachments: validatedAttachments.value,
          // Coerce validated dates to default values.
          proposalDeadline: getValidValue(
            validatedProposalDeadline,
            defaultDate
          ),
          assignmentDate: getValidValue(validatedAssignmentDate, defaultDate),
          startDate: getValidValue(validatedStartDate, defaultDate),
          completionDate: getValidValue(validatedCompletionDate, null)
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
      const validatedReward = opportunityValidation.validateReward(reward);
      const validatedSkills = opportunityValidation.validateSkills(skills);
      const validatedDescription =
        genericValidation.validateDescription(description);
      const validatedSubmissionInfo =
        opportunityValidation.validateSubmissionInfo(submissionInfo);
      const validatedAcceptanceCriteria =
        opportunityValidation.validateAcceptanceCriteria(acceptanceCriteria);
      const validatedEvaluationCriteria =
        opportunityValidation.validateEvaluationCriteria(evaluationCriteria);

      if (
        allValid([
          validatedTitle,
          validatedTeaser,
          validatedRemoteOk,
          validatedRemoteDesc,
          validatedLocation,
          validatedReward,
          validatedSkills,
          validatedDescription,
          validatedProposalDeadline,
          validatedAssignmentDate,
          validatedStartDate,
          validatedCompletionDate,
          validatedSubmissionInfo,
          validatedAcceptanceCriteria,
          validatedEvaluationCriteria
        ])
      ) {
        return valid({
          session,
          title: validatedTitle.value,
          teaser: validatedTeaser.value,
          remoteOk: validatedRemoteOk.value,
          remoteDesc: validatedRemoteDesc.value,
          location: validatedLocation.value,
          reward: validatedReward.value,
          skills: validatedSkills.value,
          description: validatedDescription.value,
          proposalDeadline: validatedProposalDeadline.value,
          assignmentDate: validatedAssignmentDate.value,
          startDate: validatedStartDate.value,
          completionDate: validatedCompletionDate.value,
          submissionInfo: validatedSubmissionInfo.value,
          acceptanceCriteria: validatedAcceptanceCriteria.value,
          evaluationCriteria: validatedEvaluationCriteria.value,
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
          reward: getInvalidValue(validatedReward, undefined),
          skills: getInvalidValue<string[][], undefined>(
            validatedSkills,
            undefined
          ),
          description: getInvalidValue(validatedDescription, undefined),
          proposalDeadline: getInvalidValue(
            validatedProposalDeadline,
            undefined
          ),
          assignmentDate: getInvalidValue(validatedAssignmentDate, undefined),
          startDate: getInvalidValue(validatedStartDate, undefined),
          completionDate: getInvalidValue(validatedCompletionDate, undefined),
          submissionInfo: getInvalidValue(validatedSubmissionInfo, undefined),
          acceptanceCriteria: getInvalidValue(
            validatedAcceptanceCriteria,
            undefined
          ),
          evaluationCrtieria: getInvalidValue(
            validatedEvaluationCriteria,
            undefined
          )
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<CWUOpportunity>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createCWUOpportunity(
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
        if (dbResult.value.status === CWUOpportunityStatus.UnderReview) {
          await cwuOpportunityNotifications.handleCWUSubmittedForReview(
            connection,
            dbResult.value
          );
        }
        // If published, notify subscribed users
        if (dbResult.value.status === CWUOpportunityStatus.Published) {
          cwuOpportunityNotifications.handleCWUPublished(
            connection,
            dbResult.value
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
  UpdateRequestBody,
  ValidatedUpdateRequestBody,
  UpdateValidationErrors
> = (connection: db.Connection) => {
  return {
    async parseRequestBody(request) {
      const body = request.body.tag === "json" ? request.body.value : {};
      const tag = get(body, "tag");
      const value: unknown = get(body, "value");
      switch (tag) {
        case "edit":
          return adt("edit", {
            title: getString(value, "title"),
            teaser: getString(value, "teaser"),
            remoteOk: get(value, "remoteOk"),
            remoteDesc: getString(value, "remoteDesc"),
            location: getString(value, "location"),
            reward: getNumber<number>(value, "reward"),
            skills: getStringArray(value, "skills"),
            description: getString(value, "description"),
            proposalDeadline: getString(value, "proposalDeadline"),
            assignmentDate: getString(value, "assignmentDate"),
            startDate: getString(value, "startDate"),
            completionDate: getString(value, "completionDate"),
            submissionInfo: getString(value, "submissionInfo"),
            acceptanceCriteria: getString(value, "acceptanceCriteria"),
            evaluationCriteria: getString(value, "evaluationCriteria"),
            attachments: getStringArray(value, "attachments")
          });
        case "submitForReview":
          return adt("submitForReview", getString(body, "value"));
        case "publish":
          return adt("publish", getString(body, "value", ""));
        case "cancel":
          return adt("cancel", getString(body, "value", ""));
        case "addAddendum":
          return adt("addAddendum", getString(body, "value", ""));
        case "addNote":
          return adt("addNote", {
            note: getString(value, "note"),
            attachments: getStringArray(value, "attachments")
          });
        default:
          return null;
      }
    },
    async validateRequestBody(request) {
      if (!request.body) {
        return invalid({ opportunity: adt("parseFailure" as const) });
      }

      const validatedCWUOpportunity = await validateCWUOpportunityId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedCWUOpportunity)) {
        return invalid({
          notFound: ["The specified opportunity does not exist."]
        });
      }
      const cwuOpportunity = validatedCWUOpportunity.value;

      if (
        !(await permissions.editCWUOpportunity(
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
            reward,
            skills,
            description,
            proposalDeadline,
            assignmentDate,
            startDate,
            completionDate,
            submissionInfo,
            acceptanceCriteria,
            evaluationCriteria,
            attachments
          } = request.body.value;

          // CWU Opportunities can only be edited if they are in DRAFT or PUBLISHED
          if (
            ![
              CWUOpportunityStatus.Draft,
              CWUOpportunityStatus.UnderReview,
              CWUOpportunityStatus.Published
            ].includes(cwuOpportunity.status)
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
              cwuOpportunity
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
          const validatedCompletionDate = mapValid(
            genericValidation.validateDateFormatMinMaxOrUndefined(
              completionDate,
              getValidValue(validatedStartDate, now)
            ),
            (v) => v || null
          );

          // Do not validate other fields if the opportunity is a draft.
          if (cwuOpportunity.status === CWUOpportunityStatus.Draft) {
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
                completionDate: getValidValue(validatedCompletionDate, null)
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
          const validatedReward = opportunityValidation.validateReward(reward);
          const validatedSkills = opportunityValidation.validateSkills(skills);
          const validatedDescription =
            genericValidation.validateDescription(description);
          const validatedSubmissionInfo =
            opportunityValidation.validateSubmissionInfo(submissionInfo);
          const validatedAcceptanceCriteria =
            opportunityValidation.validateAcceptanceCriteria(
              acceptanceCriteria
            );
          const validatedEvaluationCriteria =
            opportunityValidation.validateEvaluationCriteria(
              evaluationCriteria
            );

          if (
            allValid([
              validatedTitle,
              validatedTeaser,
              validatedRemoteOk,
              validatedRemoteDesc,
              validatedLocation,
              validatedReward,
              validatedSkills,
              validatedDescription,
              validatedProposalDeadline,
              validatedAssignmentDate,
              validatedStartDate,
              validatedCompletionDate,
              validatedSubmissionInfo,
              validatedAcceptanceCriteria,
              validatedEvaluationCriteria,
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
                reward: validatedReward.value,
                skills: validatedSkills.value,
                description: validatedDescription.value,
                proposalDeadline: validatedProposalDeadline.value,
                assignmentDate: validatedAssignmentDate.value,
                startDate: validatedStartDate.value,
                completionDate: validatedCompletionDate.value,
                submissionInfo: validatedSubmissionInfo.value,
                acceptanceCriteria: validatedAcceptanceCriteria.value,
                evaluationCriteria: validatedEvaluationCriteria.value,
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
                reward: getInvalidValue(validatedReward, undefined),
                skills: getInvalidValue<string[][], undefined>(
                  validatedSkills,
                  undefined
                ),
                description: getInvalidValue(validatedDescription, undefined),
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
                ),
                submissionInfo: getInvalidValue(
                  validatedSubmissionInfo,
                  undefined
                ),
                acceptanceCriteria: getInvalidValue(
                  validatedAcceptanceCriteria,
                  undefined
                ),
                evaluationCriteria: getInvalidValue(
                  validatedEvaluationCriteria,
                  undefined
                )
              })
            });
          }
        }
        case "submitForReview": {
          if (
            !isValidStatusChange(
              cwuOpportunity.status,
              CWUOpportunityStatus.UnderReview
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Perform validation on draft to ensure it's ready for publishing
          if (
            !allValid([
              genericValidation.validateTitle(cwuOpportunity.title),
              genericValidation.validateTeaser(cwuOpportunity.teaser),
              genericValidation.validateRemoteOk(cwuOpportunity.remoteOk),
              genericValidation.validateRemoteDesc(
                cwuOpportunity.remoteDesc,
                cwuOpportunity.remoteOk
              ),
              genericValidation.validateLocation(cwuOpportunity.location),
              genericValidation.validateDescription(cwuOpportunity.description)
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
              validatedCWUOpportunity.value.status,
              CWUOpportunityStatus.Published
            )
          ) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Only admins can publish
          if (!permissions.publishCWUOpportunity(request.session)) {
            return invalid({ permissions: [permissions.ERROR_MESSAGE] });
          }
          // Perform validation on draft to ensure it's ready for publishing
          if (
            !allValid([
              genericValidation.validateTitle(
                validatedCWUOpportunity.value.title
              ),
              genericValidation.validateTeaser(
                validatedCWUOpportunity.value.teaser
              ),
              genericValidation.validateRemoteOk(
                validatedCWUOpportunity.value.remoteOk
              ),
              genericValidation.validateRemoteDesc(
                validatedCWUOpportunity.value.remoteDesc,
                validatedCWUOpportunity.value.remoteOk
              ),
              genericValidation.validateLocation(
                validatedCWUOpportunity.value.location
              ),
              opportunityValidation.validateReward(
                validatedCWUOpportunity.value.reward
              ),
              opportunityValidation.validateSkills(
                validatedCWUOpportunity.value.skills
              ),
              genericValidation.validateDescription(
                validatedCWUOpportunity.value.description
              ),
              opportunityValidation.validateSubmissionInfo(
                validatedCWUOpportunity.value.submissionInfo
              ),
              opportunityValidation.validateAcceptanceCriteria(
                validatedCWUOpportunity.value.acceptanceCriteria
              ),
              opportunityValidation.validateEvaluationCriteria(
                validatedCWUOpportunity.value.evaluationCriteria
              )
            ])
          ) {
            return invalid({
              opportunity: adt("publish" as const, [
                "This opportunity could not be published because it is incomplete. Please edit, complete and save the form below before trying to publish it again."
              ])
            });
          }

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
          } as ValidatedUpdateRequestBody);
        }
        case "cancel": {
          if (
            !isValidStatusChange(
              validatedCWUOpportunity.value.status,
              CWUOpportunityStatus.Canceled
            ) ||
            !permissions.cancelCWUOpportunity(request.session)
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
            validatedCWUOpportunity.value.status ===
              CWUOpportunityStatus.Draft ||
            !(await permissions.addCWUAddendum(
              connection,
              request.session,
              validatedCWUOpportunity.value.id
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
        case "addNote": {
          const { note, attachments: noteAttachments } = request.body.value;
          const validatedNote = opportunityValidation.validateNote(note); //TODO changed to validateNote from validateHistoryNote as note-taking was removed from shared
          const validatedNoteAttachments = await validateAttachments(
            connection,
            noteAttachments
          );
          if (allValid([validatedNote, validatedNoteAttachments])) {
            return valid({
              session: request.session,
              body: adt("addNote", {
                note: validatedNote.value,
                attachments: validatedNoteAttachments.value
              })
            } as ValidatedUpdateRequestBody);
          } else {
            return invalid({
              opportunity: adt("addNote" as const, {
                note: getInvalidValue(validatedNote, undefined),
                attachments: getInvalidValue<string[][], undefined>(
                  validatedNoteAttachments,
                  undefined
                )
              })
            });
          }
        }
        default:
          return invalid({ opportunity: adt("parseFailure" as const) });
      }
    },
    respond: wrapRespond({
      valid: async (request) => {
        let dbResult: Validation<CWUOpportunity, null>;
        const { session, body } = request.body;
        const doNotNotify = [
          CWUOpportunityStatus.Draft,
          CWUOpportunityStatus.Canceled
        ];
        switch (body.tag) {
          case "edit":
            dbResult = await db.updateCWUOpportunityVersion(
              connection,
              { ...body.value, id: request.params.id },
              session
            );
            /**
             * Notify all subscribed users on the opportunity of the update
             * (only if not draft status)
             */
            if (
              isValid(dbResult) &&
              !Object.values(doNotNotify).includes(dbResult.value.status)
            ) {
              cwuOpportunityNotifications.handleCWUUpdated(
                connection,
                dbResult.value
              );
            }
            break;
          case "submitForReview":
            dbResult = await db.updateCWUOpportunityStatus(
              connection,
              request.params.id,
              CWUOpportunityStatus.UnderReview,
              body.value,
              session
            );
            //Notify of submission
            if (isValid(dbResult)) {
              cwuOpportunityNotifications.handleCWUSubmittedForReview(
                connection,
                dbResult.value
              );
            }
            break;
          case "publish": {
            dbResult = await db.updateCWUOpportunityStatus(
              connection,
              request.params.id,
              CWUOpportunityStatus.Published,
              body.value,
              session
            );
            // Notify subscribers of publication
            if (isValid(dbResult) && permissions.isSignedIn(request.session)) {
              cwuOpportunityNotifications.handleCWUPublished(
                connection,
                dbResult.value
              );
            }
            break;
          }
          case "cancel":
            dbResult = await db.updateCWUOpportunityStatus(
              connection,
              request.params.id,
              CWUOpportunityStatus.Canceled,
              body.value,
              session
            );
            // Notify subscribers of cancellation
            if (isValid(dbResult) && permissions.isSignedIn(request.session)) {
              cwuOpportunityNotifications.handleCWUCancelled(
                connection,
                dbResult.value
              );
            }
            break;
          case "addAddendum":
            dbResult = await db.addCWUOpportunityAddendum(
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
              cwuOpportunityNotifications.handleCWUUpdated(
                connection,
                dbResult.value
              );
            }
            break;
          case "addNote":
            dbResult = await db.addCWUOpportunityNote(
              connection,
              request.params.id,
              body.value,
              session
            );
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

const delete_: crud.Delete<
  Session,
  db.Connection,
  ValidatedDeleteRequestBody,
  DeleteValidationErrors
> = (connection: db.Connection) => {
  return {
    async validateRequestBody(request) {
      const validatedCWUOpportunity = await validateCWUOpportunityId(
        connection,
        request.params.id,
        request.session
      );
      if (isInvalid(validatedCWUOpportunity)) {
        return invalid({ notFound: ["Opportunity not found."] });
      }
      if (
        !(await permissions.deleteCWUOpportunity(
          connection,
          request.session,
          request.params.id,
          validatedCWUOpportunity.value.status
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      return valid(validatedCWUOpportunity.value.id);
    },
    respond: wrapRespond({
      valid: async (request) => {
        const dbResult = await db.deleteCWUOpportunity(
          connection,
          request.body
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
  readMany,
  readOne,
  create,
  update,
  delete: delete_
};

export default resource;
