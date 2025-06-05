import * as FormField from "front-end/lib/components/form-field";
import * as PlateEditor from "front-end/lib/components/form-field/plate-editor";
import * as NumberField from "front-end/lib/components/form-field/number";
import {
  component as component_,
  immutable,
  Immutable
} from "front-end/lib/framework";
import Link, { iconLinkSymbol, leftPlacement } from "front-end/lib/views/link";
import Icon from "front-end/lib/views/icon";
import Skills from "front-end/lib/views/skills";
import React from "react";
import {
  Col,
  Row,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter
} from "reactstrap";
import {
  CreateTWUResourceQuestionBody,
  CreateTWUResourceQuestionValidationErrors,
  DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE,
  DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT,
  TWUResourceQuestion,
  CreateTWUResourceBody
} from "shared/lib/resources/opportunity/team-with-us";
import { adt, ADT } from "shared/lib/types";
import { invalid } from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/team-with-us";
import { MARKETPLACE_AI_URL } from "front-end/config";

interface Question {
  question: Immutable<PlateEditor.State>;
  guideline: Immutable<PlateEditor.State>;
  wordLimit: Immutable<NumberField.State>;
  score: Immutable<NumberField.State>;
}

interface GenerationContext {
  title: string;
  teaser: string;
  description: string;
  location: string;
  remoteOk: boolean;
  remoteDesc?: string;
  resources: CreateTWUResourceBody[];
}

export interface State {
  questions: Question[];
  isGenerating: boolean;
  generationProgress: {
    total: number;
    completed: number;
    currentSkill: string;
  } | null;
  generationErrors: string[];
  showConfirmModal: boolean;
  generationContext?: GenerationContext;
  pendingSkills?: string[];
}

export type Msg =
  | ADT<"addQuestion">
  | ADT<"deleteQuestion", number>
  | ADT<"questionText", { childMsg: PlateEditor.Msg; qIndex: number }>
  | ADT<"guidelineText", { childMsg: PlateEditor.Msg; qIndex: number }>
  | ADT<"wordLimit", { childMsg: NumberField.Msg; qIndex: number }>
  | ADT<"score", { childMsg: NumberField.Msg; qIndex: number }>
  | ADT<"generateWithAI", GenerationContext>
  | ADT<"confirmGeneration", GenerationContext>
  | ADT<"cancelGeneration">
  | ADT<"startAIGenerationInternal">
  | ADT<"aiQuestionGenerated", { question: Question; skillIndex: number }>
  | ADT<"aiGenerationFailed", { skill: string; error: string }>
  | ADT<"aiGenerationComplete">
  | ADT<"noop">;

export interface Params {
  questions: TWUResourceQuestion[];
  generationContext?: GenerationContext;
}

function extractUniqueSkills(resources: CreateTWUResourceBody[]): string[] {
  const allSkills = resources.reduce((acc, resource) => {
    return [...acc, ...resource.mandatorySkills, ...resource.optionalSkills];
  }, [] as string[]);

  return Array.from(new Set(allSkills)).filter(
    (skill) => skill.trim().length > 0
  );
}

function generateQuestionForSkill(
  skill: string,
  context: GenerationContext,
  skillIndex: number
): component_.Cmd<Msg> {
  console.log(
    `🤖 [AI Generation] Creating command to generate question for skill "${skill}" (index: ${skillIndex})`
  );

  return {
    tag: "async" as const,
    value: async (): Promise<Msg> => {
      try {
        console.log(
          `🤖 [AI Generation] Making API request for skill "${skill}"...`
        );
        console.log(`🤖 [AI Generation] Context:`, context);

        const response = await fetch(
          `${MARKETPLACE_AI_URL}/generate-resource-question`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              skill,
              context
            })
          }
        );

        console.log(
          `🤖 [AI Generation] API response status for "${skill}":`,
          response.status
        );

        if (!response.ok) {
          throw new Error(`AI generation failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(
          `🤖 [AI Generation] API response data for "${skill}":`,
          result
        );

        const generatedQuestion = createQuestionFromAI(
          result.question || "",
          result.guideline || "",
          skillIndex
        );

        console.log(
          `🤖 [AI Generation] Successfully generated question for "${skill}"`
        );
        return adt("aiQuestionGenerated", {
          question: generatedQuestion,
          skillIndex
        });
      } catch (error) {
        console.error(
          `🤖 [AI Generation] Failed to generate question for skill "${skill}":`,
          error
        );
        return adt("aiGenerationFailed", {
          skill,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  };
}

function startAIGeneration(
  skills: string[],
  context: GenerationContext
): component_.Cmd<Msg> {
  console.log(
    `🤖 [AI Generation] Starting generation for ${skills.length} skills:`,
    skills
  );

  if (skills.length === 0) {
    return component_.cmd.dispatch(adt("aiGenerationComplete"));
  }

  // Generate the first question
  return generateQuestionForSkill(skills[0], context, 0);
}

export const init: component_.base.Init<Params, State, Msg> = (params) => {
  console.log(
    `🏗️ [Init] Initializing with ${params.questions.length} questions`
  );
  console.log(
    `🏗️ [Init] Generation context available:`,
    !!params.generationContext
  );

  const [questions, cmds] = params.questions
    .map((q, index) => createQuestion(index, q))
    .reduce(
      ([accQuestions, accCmds], [q, cs]) => [
        [...accQuestions, q],
        [...accCmds, ...cs]
      ],
      [[], []] as component_.base.InitReturnValue<Question[], Msg>
    );
  return [
    {
      questions,
      isGenerating: false,
      generationProgress: null,
      generationErrors: [],
      showConfirmModal: false,
      generationContext: params.generationContext,
      pendingSkills: undefined
    },
    cmds
  ];
};

function createQuestion(
  qIndex: number,
  question?: TWUResourceQuestion
): component_.base.InitReturnValue<Question, Msg> {
  const idNamespace = String(Math.random());
  const [questionState, questionCmds] = PlateEditor.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionQuestion,
    child: {
      value: question?.question || "",
      id: `${idNamespace}-resource-questions-question`
    }
  });
  const [guidelineState, guidelineCmds] = PlateEditor.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionGuideline,
    child: {
      value: question?.guideline || "",
      id: `${idNamespace}-resource-questions-response-guidelines`
    }
  });
  const [wordLimitState, wordLimitCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid word limit."]);
      }
      return opportunityValidation.validateResourceQuestionWordLimit(v);
    },
    child: {
      value: question
        ? question.wordLimit
        : DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT,
      id: `${idNamespace}-resource-questions-word-limit`,
      min: 1
    }
  });
  const [scoreState, scoreCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid score."]);
      }
      return opportunityValidation.validateResourceQuestionScore(v);
    },
    child: {
      value: question
        ? question.score
        : DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE,
      id: `${idNamespace}-resource-questions-score`,
      min: 1
    }
  });
  return [
    {
      question: immutable(questionState),
      guideline: immutable(guidelineState),
      wordLimit: immutable(wordLimitState),
      score: immutable(scoreState)
    },
    [
      ...component_.cmd.mapMany(
        questionCmds,
        (childMsg) => adt("questionText", { childMsg, qIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        guidelineCmds,
        (childMsg) => adt("guidelineText", { childMsg, qIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        wordLimitCmds,
        (childMsg) => adt("wordLimit", { childMsg, qIndex }) as Msg
      ),
      ...component_.cmd.mapMany(
        scoreCmds,
        (childMsg) => adt("score", { childMsg, qIndex }) as Msg
      )
    ]
  ];
}

export function createQuestionFromAI(
  questionText: string,
  guidelineText: string,
  skillIndex: number
): Question {
  console.log(
    `🤖 [Create Question] Creating question from AI for skill index ${skillIndex}`
  );

  const [questionState] = PlateEditor.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionQuestion,
    child: {
      value: questionText,
      id: `ai-generated-question-${skillIndex}`
    }
  });

  const [guidelineState] = PlateEditor.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionGuideline,
    child: {
      value: guidelineText,
      id: `ai-generated-guideline-${skillIndex}`
    }
  });

  const [wordLimitState] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid word limit."]);
      }
      return opportunityValidation.validateResourceQuestionWordLimit(v);
    },
    child: {
      value: DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT,
      id: `ai-generated-word-limit-${skillIndex}`,
      min: 1
    }
  });

  const [scoreState] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return invalid(["Please enter a valid score."]);
      }
      return opportunityValidation.validateResourceQuestionScore(v);
    },
    child: {
      value: DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE,
      id: `ai-generated-score-${skillIndex}`,
      min: 1
    }
  });

  return {
    question: immutable(questionState),
    guideline: immutable(guidelineState),
    wordLimit: immutable(wordLimitState),
    score: immutable(scoreState)
  };
}

interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
  generationContext?: GenerationContext;
}

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  console.log(
    `🔄 [Update] Received message:`,
    msg.tag,
    msg.tag !== "noop" ? msg.value : ""
  );
  console.log(
    `🔄 [Update] Current state - questions count:`,
    state.questions.length
  );
  console.log(`🔄 [Update] Current state - isGenerating:`, state.isGenerating);
  console.log(`🔄 [Update] Full message object:`, msg);

  switch (msg.tag) {
    case "noop": {
      console.log(`🔄 [Update] Processing noop`);
      return [state, []];
    }

    case "addQuestion": {
      console.log(`➕ [Update] Adding new question`);
      const [question, cmds] = createQuestion(state.questions.length);
      return [state.set("questions", [...state.questions, question]), cmds];
    }

    case "deleteQuestion": {
      console.log(`🗑️ [Update] Deleting question at index:`, msg.value);
      return [
        state.set(
          "questions",
          state.questions.reduce((acc, q, index) => {
            return index === msg.value ? acc : [...acc, q];
          }, [] as Question[])
        ),
        []
      ];
    }

    case "questionText": {
      console.log(
        `📝 [Update] Updating question text for index:`,
        msg.value.qIndex
      );
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "question"],
        childUpdate: PlateEditor.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("questionText", { qIndex, childMsg: value })
      });
    }

    case "guidelineText": {
      console.log(
        `📝 [Update] Updating guideline text for index:`,
        msg.value.qIndex
      );
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "guideline"],
        childUpdate: PlateEditor.update,
        childMsg: componentMessage,
        mapChildMsg: (value) =>
          adt("guidelineText", { qIndex, childMsg: value })
      });
    }

    case "wordLimit": {
      console.log(
        `🔢 [Update] Updating word limit for index:`,
        msg.value.qIndex
      );
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "wordLimit"],
        childUpdate: NumberField.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("wordLimit", { qIndex, childMsg: value })
      });
    }

    case "score": {
      console.log(`⭐ [Update] Updating score for index:`, msg.value.qIndex);
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "score"],
        childUpdate: NumberField.update,
        childMsg: componentMessage,
        mapChildMsg: (value) => adt("score", { qIndex, childMsg: value })
      });
    }

    case "generateWithAI": {
      console.log(`🤖 [Update] Generate with AI requested`);
      console.log(
        `🤖 [Update] Current questions count:`,
        state.questions.length
      );
      console.log(`🤖 [Update] Generation context received:`, !!msg.value);

      const hasQuestions = state.questions.length > 0;
      if (hasQuestions) {
        console.log(
          `🤖 [Update] Has existing questions, showing confirmation modal`
        );
        return [state.set("showConfirmModal", true), []];
      } else {
        console.log(`🤖 [Update] No existing questions, proceeding directly`);
        return [
          state.set("showConfirmModal", false),
          [component_.cmd.dispatch(adt("confirmGeneration", msg.value))]
        ];
      }
    }

    case "confirmGeneration": {
      console.log(`🤖 [Update] Generation confirmed, starting AI generation`);
      console.log(`🤖 [Update] Generation context received:`, !!msg.value);

      const generationContext = msg.value;

      if (!generationContext) {
        console.error(`🤖 [Update] No generation context available in message`);
        return [state.set("showConfirmModal", false), []];
      }

      const skills = extractUniqueSkills(generationContext.resources);
      console.log(
        `🤖 [Update] Extracted ${skills.length} unique skills:`,
        skills
      );

      const state_updated = state
        .set("questions", [])
        .set("isGenerating", true)
        .set("generationProgress", {
          total: skills.length,
          completed: 0,
          currentSkill:
            skills.length > 0
              ? `Generating question for "${skills[0]}"...`
              : "No skills found"
        })
        .set("generationErrors", [])
        .set("showConfirmModal", false)
        .set("pendingSkills", skills)
        .set("generationContext", generationContext);

      const cmd =
        skills.length > 0
          ? startAIGeneration(skills, generationContext)
          : component_.cmd.dispatch(adt("aiGenerationComplete") as Msg);

      return [state_updated, [cmd]];
    }

    case "cancelGeneration": {
      console.log(`🤖 [Update] Generation cancelled`);
      return [state.set("showConfirmModal", false), []];
    }

    case "startAIGenerationInternal": {
      console.log(
        `🤖 [Update] Start generation internal - this is now deprecated`
      );
      return [state, []];
    }

    case "aiQuestionGenerated": {
      const { question, skillIndex } = msg.value;
      console.log(
        `🤖 [Update] Question generated for skill index ${skillIndex}`
      );

      const newQuestions = [...state.questions, question];
      const progress = state.generationProgress!;
      const nextIndex = skillIndex + 1;
      const skills = state.pendingSkills || [];

      console.log(`🤖 [Update] Progress: ${nextIndex}/${progress.total}`);

      if (nextIndex >= progress.total || nextIndex >= skills.length) {
        // Generation complete
        console.log(
          `🤖 [Update] All questions generated! Total: ${newQuestions.length}`
        );
        return [
          state
            .set("questions", newQuestions)
            .set("isGenerating", false)
            .set("generationProgress", null)
            .set("pendingSkills", undefined),
          []
        ];
      } else {
        // Continue generation with next skill
        console.log(
          `🤖 [Update] Continuing with next skill at index ${nextIndex}: "${skills[nextIndex]}"`
        );

        const nextCmd = state.generationContext
          ? generateQuestionForSkill(
              skills[nextIndex],
              state.generationContext,
              nextIndex
            )
          : component_.cmd.dispatch(adt("aiGenerationComplete") as Msg);

        return [
          state.set("questions", newQuestions).set("generationProgress", {
            ...progress,
            completed: nextIndex,
            currentSkill: `Generating question for "${skills[nextIndex]}"...`
          }),
          [nextCmd]
        ];
      }
    }

    case "aiGenerationFailed": {
      const { skill, error } = msg.value;
      console.log(
        `🤖 [Update] AI generation failed for skill "${skill}":`,
        error
      );

      const progress = state.generationProgress!;
      const nextIndex = progress.completed + 1;
      const skills = state.pendingSkills || [];
      const newErrors = [...state.generationErrors, `${skill}: ${error}`];

      console.log(`🤖 [Update] Error progress: ${nextIndex}/${progress.total}`);

      if (nextIndex >= progress.total || nextIndex >= skills.length) {
        // Generation complete (with errors)
        console.log(`🤖 [Update] Generation complete with errors:`, newErrors);
        return [
          state
            .set("isGenerating", false)
            .set("generationProgress", null)
            .set("generationErrors", newErrors)
            .set("pendingSkills", undefined),
          []
        ];
      } else {
        // Continue with next skill despite error
        console.log(
          `🤖 [Update] Continuing despite error, next index: ${nextIndex}, skill: "${skills[nextIndex]}"`
        );

        const nextCmd = state.generationContext
          ? generateQuestionForSkill(
              skills[nextIndex],
              state.generationContext,
              nextIndex
            )
          : component_.cmd.dispatch(adt("aiGenerationComplete") as Msg);

        return [
          state.set("generationErrors", newErrors).set("generationProgress", {
            ...progress,
            completed: nextIndex,
            currentSkill: `Generating question for "${skills[nextIndex]}"...`
          }),
          [nextCmd]
        ];
      }
    }

    case "aiGenerationComplete": {
      console.log(`🤖 [Update] AI generation complete`);
      return [
        state
          .set("isGenerating", false)
          .set("generationProgress", null)
          .set("pendingSkills", undefined),
        []
      ];
    }

    default: {
      console.warn(`🔄 [Update] Unknown message type:`, (msg as any).tag, msg);
      return [state, []];
    }
  }
};

export type Values = CreateTWUResourceQuestionBody[];

export function getValues(state: Immutable<State>): Values {
  return state.questions.reduce<Values>((acc, q, order) => {
    if (!acc) {
      return acc;
    }
    const score = FormField.getValue(q.score) || 0;
    const wordLimit = FormField.getValue(q.wordLimit) || 0;
    acc.push({
      question: FormField.getValue(q.question as any) as string,
      guideline: FormField.getValue(q.guideline as any) as string,
      wordLimit,
      score,
      order
    });
    return acc;
  }, []);
}

export type Errors = CreateTWUResourceQuestionValidationErrors[];

export function setErrors(
  state: Immutable<State>,
  errors: Errors = []
): Immutable<State> {
  return errors.reduce((acc, e, i) => {
    return acc
      .updateIn(["questions", i, "question"], (s) =>
        FormField.setErrors(s as any, e.question || [])
      )
      .updateIn(["questions", i, "guideline"], (s) =>
        FormField.setErrors(s as any, e.guideline || [])
      )
      .updateIn(["questions", i, "wordLimit"], (s) =>
        FormField.setErrors(s as any, e.wordLimit || [])
      )
      .updateIn(["questions", i, "score"], (s) =>
        FormField.setErrors(s as any, e.score || [])
      );
  }, state);
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.questions.reduce((acc, q, i) => {
    return acc
      .updateIn(["questions", i, "question"], (s) =>
        FormField.validate(s as any)
      )
      .updateIn(["questions", i, "guideline"], (s) =>
        FormField.validate(s as any)
      )
      .updateIn(["questions", i, "wordLimit"], (s) =>
        FormField.validate(s as any)
      )
      .updateIn(["questions", i, "score"], (s) => FormField.validate(s as any));
  }, state);
}

export function isValid(state: Immutable<State>): boolean {
  if (!state.questions.length) {
    return false;
  }
  return state.questions.reduce((acc, q) => {
    return (
      acc &&
      FormField.isValid(q.question as any) &&
      FormField.isValid(q.guideline as any) &&
      FormField.isValid(q.wordLimit) &&
      FormField.isValid(q.score)
    );
  }, true as boolean);
}

interface QuestionViewProps {
  index: number;
  question: Question;
  disabled?: boolean;
  dispatch: component_.base.Dispatch<Msg>;
}

const QuestionView: component_.base.View<QuestionViewProps> = (props) => {
  const { question, dispatch, index, disabled } = props;
  return (
    <div className={index > 0 ? "pt-5 mt-5 border-top" : ""}>
      <Row>
        <Col xs="12">
          <div className="d-flex align-items-center mb-4">
            <h3 className="mb-0">Question {index + 1}</h3>
            {disabled ? null : (
              <Link
                button
                outline
                size="sm"
                color="info"
                className="ms-4"
                symbol_={leftPlacement(iconLinkSymbol("trash"))}
                onClick={() => dispatch(adt("deleteQuestion", index))}>
                Delete
              </Link>
            )}
          </div>
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <PlateEditor.view
            label="Question"
            placeholder="Enter your question here."
            help="Enter your question in the field provided below."
            required
            disabled={disabled}
            toolbarMode="minimal"
            state={question.question}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("questionText" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12">
          <PlateEditor.view
            label="Response Guidelines"
            placeholder="Provide some guidance on how proponents can effectively respond to your question."
            help="Provide some guidance on how proponents can effectively respond to your question."
            required
            disabled={disabled}
            toolbarMode="minimal"
            state={question.guideline}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("guidelineText" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6" lg="5">
          <NumberField.view
            extraChildProps={{
              suffix: "words"
            }}
            label="Response Word Limit"
            placeholder="Word Limit"
            required
            disabled={disabled}
            state={question.wordLimit}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("wordLimit" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="6" lg="5">
          <NumberField.view
            extraChildProps={{
              suffix: "points"
            }}
            label="Score"
            placeholder="Score"
            className="mb-0"
            required
            disabled={disabled}
            state={question.score}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("score" as const, { childMsg: value, qIndex: index })
            )}
          />
        </Col>
      </Row>
    </div>
  );
};

const AIGenerationControls: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled,
  generationContext
}) => {
  if (disabled || !generationContext) return null;

  const uniqueSkills = extractUniqueSkills(generationContext.resources);
  const hasQuestions = state.questions.length > 0;
  const hasSkills = uniqueSkills.length > 0;

  console.log(
    `🎛️ [AI Controls] Rendering with ${uniqueSkills.length} skills:`,
    uniqueSkills
  );
  console.log(
    `🎛️ [AI Controls] Has questions: ${hasQuestions}, Is generating: ${state.isGenerating}`
  );

  // Don't show if no skills
  if (!hasSkills) return null;

  return (
    <div className="ai-generation-section mb-4 p-4 border rounded bg-light">
      <Row>
        <Col xs="12">
          {/* Header */}
          <div className="d-flex align-items-center mb-3">
            <Icon name="cog" className="text-primary me-2" />
            <h5 className="mb-0">AI Question Generation</h5>
          </div>

          {/* Status Messages */}
          {!state.isGenerating && (
            <>
              <p className="mb-3 text-muted">
                {hasQuestions
                  ? `Generate new questions for your ${uniqueSkills.length} skills. This will replace all ${state.questions.length} existing questions.`
                  : `Generate evaluation questions for your ${uniqueSkills.length} selected skills.`}
              </p>

              {/* Skills Preview */}
              <div className="mb-3">
                <small className="text-muted d-block mb-1">Skills:</small>
                <Skills skills={uniqueSkills.slice(0, 8)} />
                {uniqueSkills.length > 8 && (
                  <span className="text-muted small ms-2">
                    +{uniqueSkills.length - 8} more
                  </span>
                )}
              </div>
            </>
          )}

          {/* Generation Progress */}
          {state.isGenerating && state.generationProgress && (
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span>Generating questions...</span>
                <span className="text-muted small">
                  {state.generationProgress.completed} of{" "}
                  {state.generationProgress.total}
                </span>
              </div>
              <div className="progress mb-2" style={{ height: "8px" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  style={{
                    width: `${
                      (state.generationProgress.completed /
                        state.generationProgress.total) *
                      100
                    }%`
                  }}
                />
              </div>
              <small className="text-muted">
                <Icon name="cog" className="fa-spin me-1" />
                {state.generationProgress.currentSkill}
              </small>
            </div>
          )}

          {/* Error Messages */}
          {state.generationErrors.length > 0 && !state.isGenerating && (
            <div className="alert alert-warning py-2 mb-3">
              <small>
                <Icon name="exclamation-triangle" className="me-1" />
                Some questions couldn&apos;t be generated. You can edit them manually
                or try again.
              </small>
            </div>
          )}

          {/* Action Button */}
          <div className="d-flex gap-2">
            {!state.isGenerating && (
              <Link
                button
                color={hasQuestions ? "warning" : "primary"}
                size="sm"
                onClick={() => {
                  console.log(`🎛️ [AI Controls] Generate button clicked`);
                  dispatch(adt("generateWithAI", generationContext!));
                }}>
                {hasQuestions ? "Replace All Questions" : "Generate Questions"}
              </Link>
            )}

            {state.isGenerating && (
              <Link button color="secondary" size="sm" disabled loading>
                Generating...
              </Link>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );
};

const ConfirmReplaceModal: React.FC<{
  isOpen: boolean;
  questionCount: number;
  skillCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ isOpen, questionCount, skillCount, onConfirm, onCancel }) => (
  <Modal isOpen={isOpen} toggle={onCancel}>
    <ModalHeader>Replace Questions with AI Generated?</ModalHeader>
    <ModalBody>
      <p>
        This will replace your {questionCount} existing questions with{" "}
        {skillCount} new AI-generated questions.
      </p>
      <p className="text-warning">
        <Icon name="exclamation-triangle" className="me-1" />
        This action cannot be undone.
      </p>
    </ModalBody>
    <ModalFooter>
      <Link button color="secondary" onClick={onCancel}>
        Cancel
      </Link>
      <Link button color="warning" onClick={onConfirm}>
        Replace Questions
      </Link>
    </ModalFooter>
  </Modal>
);

const AddButton: component_.base.View<Props> = ({
  state,
  disabled,
  dispatch
}) => {
  if (disabled) {
    return null;
  }
  return (
    <Row>
      <Col xs="12">
        <div className={state.questions.length ? "mt-5 pt-5 border-top" : ""}>
          <Link
            button
            outline
            disabled={disabled || state.isGenerating}
            size="sm"
            color="primary"
            symbol_={leftPlacement(iconLinkSymbol("plus-circle"))}
            onClick={() => {
              dispatch(adt("addQuestion"));
            }}>
            Add Question
          </Link>
        </div>
      </Col>
    </Row>
  );
};

export const view: component_.base.View<Props> = (props) => {
  const { state, disabled, generationContext } = props;
  const uniqueSkills = generationContext
    ? extractUniqueSkills(generationContext.resources)
    : [];

  return (
    <div>
      {/* AI Generation Controls - Only show if we have skills */}
      {generationContext && uniqueSkills.length > 0 && (
        <AIGenerationControls
          {...props}
          generationContext={generationContext}
        />
      )}

      {/* Empty State */}
      {!state.isGenerating &&
        state.questions.length === 0 &&
        uniqueSkills.length === 0 && (
          <div className="text-center py-4 text-muted">
            <Icon
              name="info-circle"
              className="mb-2 d-block"
              style={{ fontSize: "2rem" }}
            />
            <p>
              Add skills to your resources to enable AI question generation.
            </p>
            <small>Go back to the Resource Details tab to add skills.</small>
          </div>
        )}

      {/* Existing Questions */}
      {state.questions.map((question, i) => (
        <QuestionView
          key={`resource-questions-question-${i}`}
          index={i}
          disabled={disabled || state.isGenerating}
          question={question}
          dispatch={props.dispatch}
        />
      ))}

      {/* Manual Add Button - Only show if not generating */}
      {!state.isGenerating && <AddButton {...props} />}

      {/* Confirmation Modal */}
      <ConfirmReplaceModal
        isOpen={state.showConfirmModal}
        questionCount={state.questions.length}
        skillCount={uniqueSkills.length}
        onConfirm={() =>
          props.dispatch(adt("confirmGeneration", generationContext!))
        }
        onCancel={() => props.dispatch(adt("cancelGeneration"))}
      />
    </div>
  );
};
