import * as crud from "back-end/lib/crud";
import * as db from "back-end/lib/db";
import * as permissions from "back-end/lib/permissions";
import {
  JsonResponseBody,
  basicResponse,
  makeJsonResponseBody,
  nullRequestBodyHandler,
  wrapRespond
} from "back-end/lib/server";
import {
  validateSWUOpportunityId,
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
  UpdateRequestBody as SharedUpdateRequestBody,
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

type UpdateRequestBody = SharedUpdateRequestBody | null;

const routeNamespace = "question-evaluations/sprint-with-us";

const readMany: crud.ReadMany<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<SWUTeamQuestionResponseEvaluation[] | string[]>,
    Session
  >(async (request) => {
    const respond = (
      code: number,
      body: SWUTeamQuestionResponseEvaluation[] | string[]
    ) => basicResponse(code, request.session, makeJsonResponseBody(body));
    if (request.query.opportunity) {
      if (!permissions.isSignedIn(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }

      const validatedSWUProposal = await validateSWUProposalId(
        connection,
        request.query.proposal,
        request.session
      );
      if (isInvalid(validatedSWUProposal)) {
        return respond(404, ["Sprint With Us proposal not found."]);
      }

      if (
        !(await permissions.readManyIndividualSWUTeamQuestionResponseEvaluationsForConsensus(
          connection,
          request.session,
          validatedSWUProposal.value
        ))
      ) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult =
        await db.readManyIndividualSWUTeamQuestionResponseEvaluationsForConsensus(
          connection,
          request.session,
          request.query.proposal
        );
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    } else if (request.query.proposal) {
      if (!permissions.isSignedIn(request.session)) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }

      const validatedSWUOpportunity = await validateSWUOpportunityId(
        connection,
        request.query.opportunity,
        request.session
      );
      if (isInvalid(validatedSWUOpportunity)) {
        return respond(404, ["Sprint With Us opportunity not found."]);
      }

      const isConsensus = Boolean(request.query.consensus);
      if (
        !(await permissions.readManySWUTeamQuestionResponseEvaluations(
          connection,
          request.session,
          validatedSWUOpportunity.value,
          isConsensus
        ))
      ) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readManySWUTeamQuestionResponseEvaluations(
        connection,
        request.session,
        request.query.opportunity,
        isConsensus
      );
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    } else {
      if (
        !permissions.isSignedIn(request.session) ||
        !permissions.readOwnSWUTeamQuestionResponseEvaluations(request.session)
      ) {
        return respond(401, [permissions.ERROR_MESSAGE]);
      }
      const dbResult = await db.readOwnSWUTeamQuestionResponseEvaluations(
        connection,
        request.session
      );
      if (isInvalid(dbResult)) {
        return respond(503, [db.ERROR_MESSAGE]);
      }
      return respond(200, dbResult.value);
    }
  });
};

const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<SWUTeamQuestionResponseEvaluation | string[]>,
    Session
  >(async (request) => {
    const respond = (
      code: number,
      body: SWUTeamQuestionResponseEvaluation | string[]
    ) => basicResponse(code, request.session, makeJsonResponseBody(body));
    if (!permissions.isSignedIn(request.session)) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    const validatedSWUTeamQuestionResponseEvaluation =
      await validateSWUTeamQuestionResponseEvaluationId(
        connection,
        request.params.id,
        request.session
      );
    if (isInvalid(validatedSWUTeamQuestionResponseEvaluation)) {
      return respond(404, ["Evaluation not found."]);
    }
    if (
      !(await permissions.readOneSWUTeamQuestionResponseEvaluation(
        connection,
        request.session,
        validatedSWUTeamQuestionResponseEvaluation.value
      ))
    ) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    return respond(200, validatedSWUTeamQuestionResponseEvaluation.value);
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
            SWUTeamQuestionResponseEvaluationType.Consensus,
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

      // Check for existing evaluation on this proposal, authored by this user
      const dbResultEvaluation =
        await db.readOneSWUTeamQuestionResponseEvaluationByProposalAndEvaluationPanelMember(
          connection,
          validatedSWUProposal.value.id,
          validatedSWUPanelEvaluationPanelMember.value.id,
          validatedType.value,
          request.session
        );
      if (isInvalid(dbResultEvaluation)) {
        return invalid({
          database: [db.ERROR_MESSAGE]
        });
      }
      if (dbResultEvaluation.value) {
        return invalid({
          conflict: [
            "You already have an team question evaluation for this proposal."
          ]
        });
      }

      const fullOpportunity = await db.readOneSWUOpportunity(
        connection,
        validatedSWUProposal.value.opportunity.id,
        request.session
      );

      const validatedScores =
        questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
          scores,
          fullOpportunity.value?.teamQuestions ?? []
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
        return invalid({ evaluation: adt("parseFailure" as const) });
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

          // Only drafts and submitted consensuses can be edited
          if (
            validatedSWUTeamQuestionResponseEvaluation.value.status !==
              SWUTeamQuestionResponseEvaluationStatus.Draft &&
            validatedSWUTeamQuestionResponseEvaluation.value.type !==
              SWUTeamQuestionResponseEvaluationType.Consensus
          ) {
            return invalid({
              permissions: [permissions.ERROR_MESSAGE]
            });
          }

          const fullOpportunity = await db.readOneSWUOpportunity(
            connection,
            validatedSWUTeamQuestionResponseEvaluation.value.proposal
              .opportunity.id,
            request.session
          );

          const validatedScores =
            questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
              scores,
              fullOpportunity.value?.teamQuestions ?? []
            );

          if (isValid(validatedScores)) {
            return valid({
              session: request.session,
              body: adt(
                "edit" as const,
                {
                  scores: validatedScores.value
                } as ValidatedUpdateEditRequestBody
              )
            });
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

          const fullOpportunity = await db.readOneSWUOpportunity(
            connection,
            validatedSWUTeamQuestionResponseEvaluation.value.proposal
              .opportunity.id,
            request.session
          );

          const validatedScores =
            questionEvaluationValidation.validateSWUTeamQuestionResponseEvaluationScores(
              validatedSWUTeamQuestionResponseEvaluation.value.scores,
              fullOpportunity.value?.teamQuestions ?? []
            );

          if (
            isInvalid<
              CreateSWUTeamQuestionResponseEvaluationScoreValidationErrors[]
            >(validatedScores) ||
            validatedScores.value.length !==
              fullOpportunity.value?.teamQuestions.length
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
              evaluation: adt("submit" as const, validatedSubmissionNote.value)
            });
          }
          return valid({
            session: request.session,
            body: adt("submit" as const, validatedSubmissionNote.value)
          } as ValidatedUpdateRequestBody);
        }
        default:
          return invalid({ evaluation: adt("parseFailure" as const) });
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
            dbResult = await db.updateSWUTeamQuestionResponseEvaluationStatus(
              connection,
              request.params.id,
              SWUTeamQuestionResponseEvaluationStatus.Submitted,
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

const resource: crud.BasicCrudResource<Session, db.Connection> = {
  routeNamespace,
  readOne,
  readMany,
  create,
  update
};

export default resource;
