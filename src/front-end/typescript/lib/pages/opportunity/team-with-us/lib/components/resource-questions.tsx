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
  CreateTWUResourceBody,
  TWUServiceArea
} from "shared/lib/resources/opportunity/team-with-us";
import { adt, ADT } from "shared/lib/types";
import { invalid, valid } from "shared/lib/validation";
import * as opportunityValidation from "shared/lib/validation/opportunity/team-with-us";
import { MARKETPLACE_AI_URL } from "front-end/config";
import { twuServiceAreaToTitleCase } from "front-end/lib/pages/opportunity/team-with-us/lib";

interface Question {
  question: Immutable<PlateEditor.State>;
  guideline: Immutable<PlateEditor.State>;
  wordLimit: Immutable<NumberField.State>;
  score: Immutable<NumberField.State>;
  minimumScore: Immutable<NumberField.State>;
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
  generationErrors: string[];
  showConfirmModal: boolean;
  generationContext?: GenerationContext;
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
  | ADT<
      "aiBulkGenerationComplete",
      { questions: Question[]; rationale?: string }
    >
  | ADT<"aiBulkGenerationFailed", { error: string }>
  | ADT<"noop">
  | ADT<"minimumScore", { childMsg: NumberField.Msg; qIndex: number }>;

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

function generateAllQuestionsAtOnce(
  context: GenerationContext
): component_.Cmd<Msg> {
  console.log(
    `🤖 [Bulk AI Generation] Creating command to generate all questions at once`
  );
  console.log(`🤖 [Bulk AI Generation] Context:`, context);

  // Convert service area enums to user-friendly names for the server
  const contextWithFriendlyServiceAreas = {
    ...context,
    resources: context.resources.map((resource) => ({
      ...resource,
      serviceArea: twuServiceAreaToTitleCase(
        resource.serviceArea as TWUServiceArea
      )
    }))
  };

  return {
    tag: "async" as const,
    value: async (): Promise<Msg> => {
      try {
        console.log(
          `🤖 [Bulk AI Generation] Making API request for bulk generation...`
        );

        const response = await fetch(
          `${MARKETPLACE_AI_URL}/api/ai/generate-resource-questions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              context: contextWithFriendlyServiceAreas
            })
          }
        );

        console.log(
          `🤖 [Bulk AI Generation] API response status:`,
          response.status
        );

        if (!response.ok) {
          throw new Error(`AI generation failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log(`🤖 [Bulk AI Generation] API response data:`, result);

        // Convert API response to Question objects
        const generatedQuestions = result.questions.map(
          (apiQuestion: any, index: number) =>
            createQuestionFromAI(
              apiQuestion.question || "",
              apiQuestion.guideline || "",
              index,
              apiQuestion.wordLimit || 500,
              apiQuestion.score || 20
            )
        );

        console.log(
          `🤖 [Bulk AI Generation] Successfully generated ${generatedQuestions.length} questions`
        );

        return adt("aiBulkGenerationComplete", {
          questions: generatedQuestions,
          rationale: result.rationale
        });
      } catch (error) {
        console.error(
          `🤖 [Bulk AI Generation] Failed to generate questions:`,
          error
        );
        return adt("aiBulkGenerationFailed", {
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  };
}

function resetMinimumScore(
  state: Immutable<State>,
  i: number
): Immutable<State> {
  return state.updateIn(["questions", i, "minimumScore"], (s) => {
    return FormField.setValidate(
      s as Immutable<NumberField.State>,
      (v) => {
        if (v === null) {
          return valid(null);
        }
        return opportunityValidation.validateResourceQuestionMinimumScore(
          v,
          FormField.getValue(state.questions[i].score)
        );
      },
      FormField.getValue(s as Immutable<NumberField.State>) !== null
    );
  });
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
      generationErrors: [],
      showConfirmModal: false,
      generationContext: params.generationContext
    },
    cmds
  ];
};

function createQuestion(
  qIndex: number,
  question?: TWUResourceQuestion
): component_.base.InitReturnValue<Question, Msg> {
  // Use a more reliable ID generation that includes the question index
  const idNamespace = `question-${qIndex}-${Date.now()}`;
  const [questionState, questionCmds] = PlateEditor.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionQuestion,
    child: {
      value: question?.question || "",
      id: `${idNamespace}-question-editor`
    }
  });
  const [guidelineState, guidelineCmds] = PlateEditor.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionGuideline,
    child: {
      value: question?.guideline || "",
      id: `${idNamespace}-guideline-editor`
    }
  });
  console.log(
    `🏗️ [Create Question] Guideline state initialized with value:`,
    guidelineState.child.value
  );
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
      id: `${idNamespace}-word-limit`,
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
      id: `${idNamespace}-score`,
      min: 1
    }
  });
  const [minimumScoreState, minimumScoreCmds] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return valid(null);
      }
      return opportunityValidation.validateResourceQuestionMinimumScore(
        v,
        question?.score
      );
    },
    child: {
      value: question?.minimumScore || null,
      id: `${idNamespace}-minimum-score`,
      min: 0
    }
  });
  return [
    {
      question: immutable<PlateEditor.State>(questionState),
      guideline: immutable<PlateEditor.State>(guidelineState),
      wordLimit: immutable(wordLimitState),
      score: immutable(scoreState),
      minimumScore: immutable(minimumScoreState)
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
      ),
      ...component_.cmd.mapMany(
        minimumScoreCmds,
        (childMsg) => adt("minimumScore", { childMsg, qIndex }) as Msg
      )
    ]
  ];
}

export function createQuestionFromAI(
  questionText: string,
  guidelineText: string,
  questionIndex: number,
  wordLimit?: number,
  score?: number
): Question {
  console.log(
    `🤖 [Create Question] Creating question from AI for question index ${questionIndex}`
  );

  // Use the same ID pattern as createQuestion for consistency
  const idNamespace = `question-${questionIndex}-ai-generated-${Date.now()}`;

  const [questionState] = PlateEditor.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionQuestion,
    child: {
      value: questionText,
      id: `${idNamespace}-question-editor`
    }
  });

  const [guidelineState] = PlateEditor.init({
    errors: [],
    validate: opportunityValidation.validateResourceQuestionGuideline,
    child: {
      value: guidelineText,
      id: `${idNamespace}-guideline-editor`
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
      value: wordLimit || DEFAULT_RESOURCE_QUESTION_RESPONSE_WORD_LIMIT,
      id: `${idNamespace}-word-limit`,
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
      value: score || DEFAULT_RESOURCE_QUESTION_AVAILABLE_SCORE,
      id: `${idNamespace}-score`,
      min: 1
    }
  });

  const [minimumScoreState] = NumberField.init({
    errors: [],
    validate: (v) => {
      if (v === null) {
        return valid(null);
      }
      return opportunityValidation.validateResourceQuestionMinimumScore(
        v,
        score
      );
    },
    child: {
      value: null,
      id: `${idNamespace}-minimum-score`,
      min: 0
    }
  });

  return {
    question: immutable(questionState),
    guideline: immutable(guidelineState),
    wordLimit: immutable(wordLimitState),
    score: immutable(scoreState),
    minimumScore: immutable(minimumScoreState)
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

      const result: component_.base.UpdateReturnValue<State, Msg> =
        component_.base.updateChild({
          state,
          childStatePath: ["questions", `${qIndex}`, "question"],
          childUpdate: PlateEditor.update,
          childMsg: componentMessage,
          mapChildMsg: (value) =>
            adt("questionText", { qIndex, childMsg: value })
        });

      return result;
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
        mapChildMsg: (value) => adt("score", { qIndex, childMsg: value }),
        updateAfter: (state) => [resetMinimumScore(state, qIndex), []]
      });
    }

    case "minimumScore": {
      const componentMessage = msg.value.childMsg;
      const qIndex = msg.value.qIndex;
      return component_.base.updateChild({
        state,
        childStatePath: ["questions", `${qIndex}`, "minimumScore"],
        childUpdate: NumberField.update,
        childMsg: componentMessage,
        mapChildMsg: (value) =>
          adt("minimumScore", { qIndex, childMsg: value }),
        updateAfter: (state) => [resetMinimumScore(state, qIndex), []]
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
      console.log(
        `🤖 [Update] Generation confirmed, starting bulk AI generation`
      );
      console.log(`🤖 [Update] Generation context received:`, !!msg.value);

      const generationContext = msg.value;

      if (!generationContext) {
        console.error(`🤖 [Update] No generation context available in message`);
        return [state.set("showConfirmModal", false), []];
      }

      const uniqueSkills = extractUniqueSkills(generationContext.resources);
      console.log(
        `🤖 [Update] Extracted ${uniqueSkills.length} unique skills for bulk generation:`,
        uniqueSkills
      );

      if (uniqueSkills.length === 0) {
        console.warn(`🤖 [Update] No skills found, cannot generate questions`);
        return [
          state
            .set("showConfirmModal", false)
            .set("generationErrors", [
              "No skills found in resources. Please add skills to generate questions."
            ]),
          []
        ];
      }

      const state_updated = state
        .set("questions", [])
        .set("isGenerating", true)
        .set("generationErrors", [])
        .set("showConfirmModal", false)
        .set("generationContext", generationContext);

      const cmd = generateAllQuestionsAtOnce(generationContext);

      return [state_updated, [cmd]];
    }

    case "cancelGeneration": {
      console.log(`🤖 [Update] Generation cancelled`);
      return [state.set("showConfirmModal", false), []];
    }

    case "aiBulkGenerationComplete": {
      const { questions, rationale } = msg.value;
      console.log(
        `🤖 [Update] Bulk generation complete! Generated ${questions.length} questions`
      );
      console.log(`🤖 [Update] Generation rationale:`, rationale);

      return [
        state
          .set("questions", questions)
          .set("isGenerating", false)
          .set("generationErrors", []),
        []
      ];
    }

    case "aiBulkGenerationFailed": {
      const { error } = msg.value;
      console.log(`🤖 [Update] Bulk generation failed:`, error);

      return [
        state.set("isGenerating", false).set("generationErrors", [error]),
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
  // At the start of getValues
  console.log("🔍 [getValues] Full state structure:", {
    stateKeys: Object.keys(state),
    questionsLength: state.questions?.length,
    questionsStructure: state.questions?.map((q, i) => ({
      index: i,
      questionValue: FormField.getValue(q.question as any),
      questionType: typeof FormField.getValue(q.question as any),
      questionState: q.question
    }))
  });

  // Check if state is being mutated elsewhere
  console.log("🔍 [getValues] State mutation check:", {
    stateReference: state,
    stateId: state.toString ? state.toString() : "No toString",
    questionsReference: state.questions,
    questionsId: state.questions.toString
      ? state.questions.toString()
      : "No toString"
  });

  console.log(
    "🔍 [getValues] Getting values from questions:",
    state.questions.length
  );

  return state.questions.reduce<Values>((acc, q, order) => {
    const questionValue = FormField.getValue(q.question as any);
    const guidelineValue = FormField.getValue(q.guideline as any);

    console.log(`🔍 [getValues] Processing question ${order}:`, {
      questionValue,
      guidelineValue,
      wordLimit: FormField.getValue(q.wordLimit),
      score: FormField.getValue(q.score),
      minimumScore: FormField.getValue(q.minimumScore),
      questionValueType: typeof questionValue
    });

    if (!acc) {
      return acc;
    }
    const score = FormField.getValue(q.score) || 0;
    const wordLimit = FormField.getValue(q.wordLimit) || 0;
    console.log(
      "🔍 [getValues] Pushing question/guideline:",
      questionValue,
      guidelineValue
    );
    acc.push({
      question: FormField.getValue(q.question as any) as string,
      guideline: FormField.getValue(q.guideline as any) as string,
      wordLimit,
      score,
      order,
      minimumScore: FormField.getValue(q.minimumScore)
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
        FormField.setErrors(s as Immutable<NumberField.State>, e.score || [])
      )
      .updateIn(["questions", i, "minimumScore"], (s) =>
        FormField.setErrors(
          s as Immutable<NumberField.State>,
          e.minimumScore || []
        )
      );
  }, state);
}

export function validate(state: Immutable<State>): Immutable<State> {
  return state.questions.reduce((acc, q, i) => {
    return acc
      .updateIn(["questions", i, "question"], (s) =>
        PlateEditor.validate(s as any)
      )
      .updateIn(["questions", i, "guideline"], (s) =>
        PlateEditor.validate(s as any)
      )
      .updateIn(["questions", i, "wordLimit"], (s) =>
        FormField.validate(s as any)
      )
      .updateIn(["questions", i, "score"], (s) =>
        FormField.validate(s as Immutable<NumberField.State>)
      )
      .updateIn(["questions", i, "minimumScore"], (s) =>
        FormField.validate(s as Immutable<NumberField.State>)
      );
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
      FormField.isValid(q.score) &&
      FormField.isValid(q.minimumScore)
    );
  }, true as boolean);
}

interface QuestionViewProps {
  index: number;
  question: Question;
  disabled?: boolean;
  dispatch: component_.base.Dispatch<Msg>;
  generationContext?: GenerationContext;
  allQuestions: Question[];
}

const QuestionView: component_.base.View<QuestionViewProps> = (props) => {
  const {
    question,
    dispatch,
    index,
    disabled,
    generationContext,
    allQuestions
  } = props;

  // Build context for AI generation
  const baseContext = generationContext
    ? {
        title: generationContext.title,
        teaser: generationContext.teaser,
        description: generationContext.description,
        location: generationContext.location,
        remoteOk: generationContext.remoteOk,
        remoteDesc: generationContext.remoteDesc,
        resources: generationContext.resources
      }
    : {};

  // Get existing questions text for context
  const existingQuestions = allQuestions
    .map((q, i) => {
      if (i === index) return null; // Don't include current question
      const questionText = FormField.getValue(q.question as any);
      return questionText &&
        typeof questionText === "string" &&
        questionText.trim()
        ? questionText.trim()
        : null;
    })
    .filter(Boolean) as string[];

  // Get current question text for guideline generation
  const currentQuestionTextValue = FormField.getValue(question.question as any);
  const currentQuestionText =
    typeof currentQuestionTextValue === "string"
      ? currentQuestionTextValue
      : "";

  // Create unique context objects for each editor to ensure proper AI targeting
  const questionContext = {
    ...baseContext,
    fieldType: "question" as const,
    existingQuestions: [...existingQuestions], // Create new array instance
    currentQuestionText,
    editorId: `question-${index}-question-editor` // Add unique editor identifier
  };

  const guidelineContext = {
    ...baseContext,
    fieldType: "guideline" as const,
    existingQuestions: [...existingQuestions], // Create new array instance
    currentQuestionText,
    editorId: `question-${index}-guideline-editor` // Add unique editor identifier
  };

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
            key={`question-editor-${index}`}
            label="Question"
            placeholder="Enter your question here."
            help="Enter your question in the field provided below."
            required
            disabled={disabled}
            toolbarMode="minimal"
            opportunityContext={questionContext}
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
            key={`guideline-editor-${index}`}
            label="Response Guidelines"
            placeholder="Provide some guidance on how proponents can effectively respond to your question."
            help="Provide some guidance on how proponents can effectively respond to your question."
            required
            disabled={disabled}
            toolbarMode="minimal"
            opportunityContext={guidelineContext}
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
            required
            disabled={disabled}
            state={question.score}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("score" as const, { childMsg: value, qIndex: index })
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
            label="Minimum Score"
            placeholder="Minimum Score"
            help="Please enter a number between zero and score entered above. Proponents scoring below this value will be disqualified."
            className="mb-0"
            disabled={disabled}
            state={question.minimumScore}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("minimumScore" as const, { childMsg: value, qIndex: index })
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

  // console.log(
  //   `🎛️ [AI Controls] Rendering with ${uniqueSkills.length} skills:`,
  //   uniqueSkills
  // );
  // console.log(
  //   `🎛️ [AI Controls] Has questions: ${hasQuestions}, Is generating: ${state.isGenerating}`
  // );

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
                  ? `Generate optimized evaluation questions for your resources and ${uniqueSkills.length} skills. This will replace all ${state.questions.length} existing questions.`
                  : `Generate comprehensive evaluation questions optimized for your resources and ${uniqueSkills.length} skills.`}
              </p>

              {/* Skills Preview */}
              <div className="mb-3">
                <small className="text-muted d-block mb-1">
                  Skills to evaluate:
                </small>
                <Skills skills={uniqueSkills.slice(0, 8)} />
                {uniqueSkills.length > 8 && (
                  <span className="text-muted small ms-2">
                    +{uniqueSkills.length - 8} more
                  </span>
                )}
              </div>

              {/* Service Areas */}
              <div className="mb-3">
                <small className="text-muted d-block mb-1">
                  Service areas:
                </small>
                <div className="d-flex flex-wrap gap-1">
                  {Array.from(
                    new Set(
                      generationContext.resources.map((r) => r.serviceArea)
                    )
                  ).map((serviceArea) => (
                    <span key={serviceArea} className="badge bg-secondary">
                      {twuServiceAreaToTitleCase(serviceArea as TWUServiceArea)}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Generation Progress */}
          {state.isGenerating && (
            <div className="mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span>Generating optimized questions...</span>
                <Icon name="cog" className="fa-spin" />
              </div>
              <div className="progress mb-2" style={{ height: "8px" }}>
                <div
                  className="progress-bar progress-bar-striped progress-bar-animated"
                  style={{ width: "100%" }}
                />
              </div>
              <small className="text-muted">
                Analyzing {uniqueSkills.length} skills across multiple service
                areas to create comprehensive evaluation questions...
              </small>
            </div>
          )}

          {/* Error Messages */}
          {state.generationErrors.length > 0 && !state.isGenerating && (
            <div className="alert alert-warning py-2 mb-3">
              <small>
                <Icon name="exclamation-triangle" className="me-1" />
                {state.generationErrors.join("; ")} You can try again or create
                questions manually.
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
        This will replace your {questionCount} existing questions with new
        AI-generated questions optimized for {skillCount} skills across your
        service areas.
      </p>
      <p className="text-muted">
        The AI will create an optimized set of questions that comprehensively
        evaluates all your skills and service areas while minimizing redundancy.
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
          generationContext={generationContext}
          allQuestions={state.questions}
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
