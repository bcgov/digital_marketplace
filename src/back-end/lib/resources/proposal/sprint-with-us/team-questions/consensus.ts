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
  validateSWUProposalId,
  validateSWUTeamQuestionResponseEvaluation
} from "back-end/lib/validation";
import { get, omit } from "lodash";
import { getNumber, getString } from "shared/lib";
import {
  CreateValidationErrors,
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationStatus,
  CreateRequestBody as SharedCreateRequestBody,
  UpdateRequestBody as SharedUpdateRequestBody,
  UpdateValidationErrors
} from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { ADT, Id, adt } from "shared/lib/types";
import {
  Validation,
  getInvalidValue,
  invalid,
  isInvalid,
  valid
} from "shared/lib/validation";
import * as questionEvaluationValidation from "shared/lib/validation/evaluations/sprint-with-us/team-questions";

interface ValidatedCreateRequestBody extends SharedCreateRequestBody {
  session: AuthenticatedSession;
  evaluationPanelMember: Id;
  proposal: Id;
}

interface ValidatedUpdateRequestBody {
  session: AuthenticatedSession;
  body: ADT<"edit", ValidatedUpdateEditRequestBody>;
}

type ValidatedUpdateEditRequestBody = Omit<
  ValidatedCreateRequestBody,
  "proposal" | "evaluationPanelMember" | "status" | "type" | "session"
> & { proposalId: Id; userId: Id };

type CreateRequestBody = Omit<SharedCreateRequestBody, "type" | "status"> & {
  status: string;
};

type UpdateRequestBody = SharedUpdateRequestBody | null;

const routeNamespace =
  "proposal/sprint-with-us/:proposalId/team-questions/consensus";

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
    const validatedSWUProposal = await validateSWUProposalId(
      connection,
      request.params.proposalId,
      request.session
    );
    if (isInvalid(validatedSWUProposal)) {
      return respond(404, ["Proposal not found."]);
    }
    const validatedSWUTeamQuestionResponseEvaluation =
      await validateSWUTeamQuestionResponseEvaluation(
        connection,
        request.params.proposalId,
        request.params.id,
        request.session,
        true
      );
    if (isInvalid(validatedSWUTeamQuestionResponseEvaluation)) {
      return respond(404, ["Evaluation not found."]);
    }
    if (
      !(await permissions.readOneSWUTeamQuestionResponseConsensus(
        request.session,
        validatedSWUProposal.value.opportunity,
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
        status: getString(body, "status"),
        scores: get<typeof body, string>(body, "scores")
      };
    },
    async validateRequestBody(request) {
      const { scores, status } = request.body;

      if (!permissions.isSignedIn(request.session)) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
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
        request.params.proposalId,
        request.session
      );
      if (isInvalid(validatedSWUProposal)) {
        return invalid({
          proposal: getInvalidValue(validatedSWUProposal, undefined)
        });
      }

      if (
        !(await permissions.createSWUTeamQuestionResponseConsensus(
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
        await db.readOneSWUEvaluationPanelMember(
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
        await db.readOneSWUTeamQuestionResponseEvaluation(
          connection,
          validatedSWUProposal.value.id,
          validatedSWUPanelEvaluationPanelMember.value.user.id,
          request.session,
          true
        );
      if (isInvalid(dbResultEvaluation)) {
        return invalid({
          database: [db.ERROR_MESSAGE]
        });
      }
      if (dbResultEvaluation.value) {
        return invalid({
          conflict: [
            "You already have a team question evaluation for this proposal."
          ]
        });
      }

      return valid({
        session: request.session,
        proposal: validatedSWUProposal.value.id,
        evaluationPanelMember:
          validatedSWUPanelEvaluationPanelMember.value.user.id,
        status: validatedStatus.value,
        scores: scores.map((score) => ({
          score: getNumber<number>(score, "score", undefined, false),
          notes: getString(score, "notes"),
          order: getNumber<number>(score, "order")
        }))
      } as ValidatedCreateRequestBody);
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
          request.body.session,
          true
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
            scores: get<typeof value, string>(value, "scores")
          });
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
      const validatedSWUProposal = await validateSWUProposalId(
        connection,
        request.params.proposalId,
        request.session
      );
      if (isInvalid(validatedSWUProposal)) {
        return invalid({
          notFound: getInvalidValue(validatedSWUProposal, undefined)
        });
      }

      const validatedSWUTeamQuestionResponseEvaluation =
        await validateSWUTeamQuestionResponseEvaluation(
          connection,
          request.params.proposalId,
          request.params.id,
          request.session,
          true
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
        !permissions.editSWUTeamQuestionResponseConsensus(
          request.session,
          validatedSWUProposal.value.opportunity,
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
          return valid({
            session: request.session,
            body: adt(
              "edit" as const,
              {
                scores: scores.map((score) => ({
                  score: getNumber<number>(score, "score", undefined, false),
                  notes: getString(score, "notes"),
                  order: getNumber<number>(score, "order")
                }))
              } as ValidatedUpdateEditRequestBody
            )
          });
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
              {
                ...body.value,
                proposal: request.params.proposalId,
                evaluationPanelMember: request.params.id
              },
              session,
              true
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
  create,
  update
};

export default resource;
