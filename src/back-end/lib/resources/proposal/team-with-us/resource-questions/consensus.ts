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
  validateTWUProposalId,
  validateTWUResourceQuestionResponseEvaluation
} from "back-end/lib/validation";
import { get, omit } from "lodash";
import { getNumber, getString } from "shared/lib";
import {
  CreateValidationErrors,
  TWUResourceQuestionResponseEvaluation,
  TWUResourceQuestionResponseEvaluationStatus,
  CreateRequestBody as SharedCreateRequestBody,
  UpdateRequestBody as SharedUpdateRequestBody,
  UpdateValidationErrors
} from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { ADT, Id, adt } from "shared/lib/types";
import {
  Validation,
  getInvalidValue,
  invalid,
  isInvalid,
  valid
} from "shared/lib/validation";
import * as questionEvaluationValidation from "shared/lib/validation/evaluations/team-with-us/resource-questions";

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
  "proposal/team-with-us/:proposalId/resource-questions/consensus";

const readOne: crud.ReadOne<Session, db.Connection> = (
  connection: db.Connection
) => {
  return nullRequestBodyHandler<
    JsonResponseBody<TWUResourceQuestionResponseEvaluation | string[]>,
    Session
  >(async (request) => {
    const respond = (
      code: number,
      body: TWUResourceQuestionResponseEvaluation | string[]
    ) => basicResponse(code, request.session, makeJsonResponseBody(body));
    if (!permissions.isSignedIn(request.session)) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    const validatedTWUProposal = await validateTWUProposalId(
      connection,
      request.params.proposalId,
      request.session
    );
    if (isInvalid(validatedTWUProposal)) {
      return respond(404, ["Proposal not found."]);
    }
    const validatedTWUResourceQuestionResponseEvaluation =
      await validateTWUResourceQuestionResponseEvaluation(
        connection,
        request.params.proposalId,
        request.params.id,
        request.session,
        true
      );
    if (isInvalid(validatedTWUResourceQuestionResponseEvaluation)) {
      return respond(404, ["Evaluation not found."]);
    }
    if (
      !(await permissions.readOneTWUResourceQuestionResponseConsensus(
        request.session,
        validatedTWUProposal.value.opportunity,
        validatedTWUResourceQuestionResponseEvaluation.value
      ))
    ) {
      return respond(401, [permissions.ERROR_MESSAGE]);
    }
    return respond(200, validatedTWUResourceQuestionResponseEvaluation.value);
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
        questionEvaluationValidation.validateTWUResourceQuestionResponseEvaluationStatus(
          status,
          [TWUResourceQuestionResponseEvaluationStatus.Draft]
        );
      if (isInvalid(validatedStatus)) {
        return invalid({
          status: validatedStatus.value
        });
      }

      const validatedTWUProposal = await validateTWUProposalId(
        connection,
        request.params.proposalId,
        request.session
      );
      if (isInvalid(validatedTWUProposal)) {
        return invalid({
          proposal: getInvalidValue(validatedTWUProposal, undefined)
        });
      }

      if (
        !(await permissions.createTWUResourceQuestionResponseConsensus(
          connection,
          request.session,
          validatedTWUProposal.value
        ))
      ) {
        return invalid({
          permissions: [permissions.ERROR_MESSAGE]
        });
      }

      const validatedTWUPanelEvaluationPanelMember =
        await db.readOneTWUEvaluationPanelMember(
          connection,
          request.session.user.id,
          validatedTWUProposal.value.opportunity.id
        );
      if (!validatedTWUPanelEvaluationPanelMember.value) {
        return invalid({
          evaluationPanelMember: ["evaluation panel member not found"]
        });
      }

      // Check for existing evaluation on this proposal, authored by this user
      const dbResultEvaluation =
        await db.readOneTWUResourceQuestionResponseEvaluation(
          connection,
          validatedTWUProposal.value.id,
          validatedTWUPanelEvaluationPanelMember.value.user.id,
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
            "You already have a resource question evaluation for this proposal."
          ]
        });
      }

      return valid({
        session: request.session,
        proposal: validatedTWUProposal.value.id,
        evaluationPanelMember:
          validatedTWUPanelEvaluationPanelMember.value.user.id,
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
      JsonResponseBody<TWUResourceQuestionResponseEvaluation>,
      JsonResponseBody<CreateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        const dbResult = await db.createTWUResourceQuestionResponseEvaluation(
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
      const validatedTWUProposal = await validateTWUProposalId(
        connection,
        request.params.proposalId,
        request.session
      );
      if (isInvalid(validatedTWUProposal)) {
        return invalid({
          notFound: getInvalidValue(validatedTWUProposal, undefined)
        });
      }

      const validatedTWUResourceQuestionResponseEvaluation =
        await validateTWUResourceQuestionResponseEvaluation(
          connection,
          request.params.proposalId,
          request.params.id,
          request.session,
          true
        );
      if (isInvalid(validatedTWUResourceQuestionResponseEvaluation)) {
        return invalid({
          notFound: getInvalidValue(
            validatedTWUResourceQuestionResponseEvaluation,
            undefined
          )
        });
      }

      if (
        !permissions.editTWUResourceQuestionResponseConsensus(
          request.session,
          validatedTWUProposal.value.opportunity,
          validatedTWUResourceQuestionResponseEvaluation.value
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
      JsonResponseBody<TWUResourceQuestionResponseEvaluation>,
      JsonResponseBody<UpdateValidationErrors>,
      Session
    >({
      valid: async (request) => {
        let dbResult: Validation<TWUResourceQuestionResponseEvaluation, null>;
        const { session, body } = request.body;
        switch (body.tag) {
          case "edit":
            dbResult = await db.updateTWUResourceQuestionResponseEvaluation(
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
