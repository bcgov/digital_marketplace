import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  JsonResponseBody,
  basicResponse,
  makeJsonResponseBody,
  wrapRespond
} from "back-end/lib/server";
import {
  validateSWUProposalId,
  validateSWUTeamQuestionResponseEvaluationId
} from "back-end/lib/validation";
import { get, omit } from "lodash";
import { getString } from "shared/lib";
import {
  CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors,
  CreateValidationErrors,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationStatus,
  SWUTeamQuestionResponseEvaluationType,
  CreateRequestBody as SharedCreateRequestBody,
  UpdateRequestBody,
  UpdateValidationErrors,
  isValidStatusChange
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { ADT, Id, adt } from "shared/lib/types";
import {
  Validation,
  getInvalidValue,
  invalid,
  isInvalid,
  isValid,
  valid
} from "shared/lib/validation";
import * as questionEvaluationValidation from "shared/lib/validation/question-evaluation/sprint-with-us";

interface ValidatedCreateRequestBody extends SharedCreateRequestBody {
  session: AuthenticatedSession;
  evaluationPanelMember: Id;
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body: ADT<"edit", ValidatedUpdateEditRequestBody> | ADT<"submit", string>;
}

type ValidatedUpdateEditRequestBody = Omit<
  ValidatedCreateRequestBody,
  "proposal" | "evaluationPanelMember" | "status" | "type" | "session"
>;

type CreateRequestBody = Omit<SharedCreateRequestBody, "type" | "status"> & {
  status: string;
  type: string;
};

const routeNamespace = "question-evaluations/sprint-with-us";

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
        proposal: getString(body, "proposal"),
        type: getString(body, "type"),
        status: getString(body, "status"),
        scores: get(body, "scores")
      };
    },
    async validateRequestBody(request) {
      const { proposal, type, scores, status } = request.body;

      if (!permissions.isSignedIn(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      const validatedType =
        questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationType(
          type,
          [
            SWUTeamQuestionResponseEvaluationType.Conensus,
            SWUTeamQuestionResponseEvaluationType.Individual
          ]
        );
      if (isInvalid(validatedType)) {
        return invalid({
          type: validatedType.value
        });
      }

      const validatedStatus =
        questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationStatus(
          status,
          [SWUTeamQuestionResponseEvaluationStatus.Draft]
        );
      if (isInvalid(validatedStatus)) {
        return invalid({
          status: validatedStatus.value
        });
      }

      const validatedSWUProposal = await validateSWUProposalId(
        connection,
        proposal,
        request.session
      );
      if (isInvalid(validatedSWUProposal)) {
        return invalid({
          proposal: getInvalidValue(validatedSWUProposal, undefined)
        });
      }

      if (
        !(await permissions.createSWUTeamQuestionResponseEvaluation(
          connection,
          request.session,
          validatedSWUProposal.value
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      const validatedSWUPanelEvaluationPanelMember =
        await db.readOneSWUEvaluationPanelMemberWithId(
          connection,
          request.session.user.id,
          validatedSWUProposal.value.opportunity.id
        );
      if (!validatedSWUPanelEvaluationPanelMember.value) {
        return invalid({
          evaluationPanelMember: ["evaluation panel member not found"]
        });
      }

      const validatedScores =
        questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
          scores,
          validatedSWUProposal.value.teamQuestionResponses
        );

      if (isValid(validatedScores)) {
        return valid({
          session: request.session,
          proposal: validatedSWUProposal.value.id,
          evaluationPanelMember:
            validatedSWUPanelEvaluationPanelMember.value.id,
          status: validatedStatus.value,
          type: validatedType.value,
          scores: validatedScores.value
        } as ValidatedCreateRequestBody);
      } else {
        return invalid({
          scores: getInvalidValue(validatedScores, undefined)
        });
      }
    },
    respond: wrapRespond<
      ValidatedCreateRequestBody,
      CreateValidationErrors,
      JsonResponseBody<SWUTeamQuestionResponseEvaluation>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createSWUTeamQuestionResponseEvaluation(
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
            scores: get(value, "scores")
          });
        case "submit":
          return adt("submit", getString(body, "value", ""));
        default:
          return null;
      }
    },
    async validateRequestBody(request) {
      if (!request.body) {
        return invalid({ proposal: adt("parseFailure" as const) });
      }
      if (!permissions.isSignedIn(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }
      const validatedSWUTeamQuestionResponseEvaluation =
        await validateSWUTeamQuestionResponseEvaluationId(
          connection,
          request.params.id,
          request.session
        );
      if (isInvalid(validatedSWUTeamQuestionResponseEvaluation)) {
        return invalid({
          notFound: getInvalidValue(
            validatedSWUTeamQuestionResponseEvaluation,
            undefined
          )
        });
      }

      if (
        !permissions.editSWUTeamQuestionResponseEvaluation(
          request.session,
          validatedSWUTeamQuestionResponseEvaluation.value
        )
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      switch (request.body.tag) {
        case "edit": {
          const scores = request.body.value.scores;

          const fullProposal = await db.readOneSWUProposal(
            connection,
            validatedSWUTeamQuestionResponseEvaluation.value.proposal.id,
            request.session
          );

          const validatedScores =
            questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
              scores,
              fullProposal.value?.teamQuestionResponses ?? []
            );

          if (isValid(validatedScores)) {
            return valid(
              adt(
                "edit" as const,
                {
                  scores: validatedScores.value
                } as ValidatedUpdateEditRequestBody
              )
            );
          } else {
            return invalid({
              evaluation: adt("edit" as const, {
                scores: getInvalidValue(validatedScores, undefined)
              })
            });
          }
        }
        case "submit": {
          if (
            !isValidStatusChange(
              validatedSWUTeamQuestionResponseEvaluation.value.status,
              SWUTeamQuestionResponseEvaluationStatus.Submitted
            )
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }

          const fullProposal = await db.readOneSWUProposal(
            connection,
            validatedSWUTeamQuestionResponseEvaluation.value.proposal.id,
            request.session
          );

          const validatedScores =
            questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
              validatedSWUTeamQuestionResponseEvaluation.value.scores,
              fullProposal.value?.teamQuestionResponses ?? []
            );

          if (
            isInvalid<
              CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors[]
            >(validatedScores) ||
            validatedScores.value.length !==
              fullProposal.value?.teamQuestionResponses.length
          ) {
            return invalid({
              evaluation: adt("submit" as const, [
                "This evaluation could not be submitted for review because it is incomplete. Please edit, complete and save the appropriate form before trying to submit it again."
              ])
            });
          }

          if (
            !permissions.submitSWUTeamQuestionResponseEvaluation(
              request.session,
              validatedSWUTeamQuestionResponseEvaluation.value
            )
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }

          const validatedSubmissionNote =
            questionEvaluationValidation.validateNote(request.body.value);
          if (isInvalid(validatedSubmissionNote)) {
            return invalid({
              proposal: adt("submit" as const, validatedSubmissionNote.value)
            });
          }
          return valid({
            session: request.session,
            body: adt("submit" as const, validatedSubmissionNote.value)
          } as ValidatedUpdateRequestBody);
        }
        default:
          return invalid({ proposal: adt("parseFailure" as const) });
      }
    },
    respond: wrapRespond<
      ValidatedUpdateRequestBody,
      UpdateValidationErrors,
      JsonResponseBody<SWUTeamQuestionResponseEvaluation>,
      JsonResponseBody<UpdateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        let dbResult: Validation<SWUTeamQuestionResponseEvaluation, null>;
        const { session, body } = request.body;
        switch (body.tag) {
          case "edit":
            dbResult = await db.updateSWUTeamQuestionResponseEvaluation(
              connection,
              { ...body.value, id: request.params.id },
              session
            );
            break;
          case "submit":
            dbResult = await db.updateSWUProposalStatus(
              connection,
              request.params.id,
              SWUProposalStatus.Submitted,
              body.value,
              session
            );
            // Notify of submission
            if (isValid(dbResult)) {
              swuProposalNotifications.handleSWUProposalSubmitted(
                connection,
                request.params.id,
                request.body.session
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

const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  create,
  update
};

export default resource;
