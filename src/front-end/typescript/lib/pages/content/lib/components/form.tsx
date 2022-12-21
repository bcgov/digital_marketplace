import * as FormField from "front-end/lib/components/form-field";
import * as RichMarkdownEditor from "front-end/lib/components/form-field/rich-markdown-editor";
import * as ShortText from "front-end/lib/components/form-field/short-text";
import {
  Immutable,
  immutable,
  component as component_
} from "front-end/lib/framework";
import * as api from "front-end/lib/http/api";
import { slugPath } from "front-end/lib/pages/content/lib";
import React from "react";
import { Col, Row } from "reactstrap";
import {
  Content,
  CreateRequestBody,
  CreateValidationErrors
} from "shared/lib/resources/content";
import { adt, ADT } from "shared/lib/types";
import * as contentValidation from "shared/lib/validation/content";

export interface State {
  content: Content | null;
  title: Immutable<ShortText.State>;
  slug: Immutable<ShortText.State>;
  body: Immutable<RichMarkdownEditor.State>;
}

export type Msg =
  | ADT<"title", ShortText.Msg>
  | ADT<"slug", ShortText.Msg>
  | ADT<"body", RichMarkdownEditor.Msg>;

export interface Params {
  content?: Content;
}

export function isValid(state: Immutable<State>): boolean {
  return (
    FormField.isValid(state.title) &&
    FormField.isValid(state.slug) &&
    FormField.isValid(state.body)
  );
}

export type Values = CreateRequestBody;

export function getValues(state: Immutable<State>): Values {
  return {
    title: FormField.getValue(state.title),
    slug: FormField.getValue(state.slug),
    body: FormField.getValue(state.body)
  };
}

export type Errors = CreateValidationErrors;

export function setErrors(
  state: Immutable<State>,
  errors: Errors
): Immutable<State> {
  return state
    .update("title", (s) => FormField.setErrors(s, errors.title || []))
    .update("slug", (s) => FormField.setErrors(s, errors.slug || []))
    .update("body", (s) => FormField.setErrors(s, errors.body || []));
}

export const init: component_.base.Init<Params, State, Msg> = ({
  content = null
}) => {
  const [titleState, titleCmds] = ShortText.init({
    errors: [],
    validate: contentValidation.validateTitle,
    child: {
      type: "text",
      value: content?.title || "",
      id: "content-title"
    }
  });
  const [slugState, slugCmds] = ShortText.init({
    errors: [],
    validate: contentValidation.validateSlug,
    child: {
      type: "text",
      value: content?.slug || "",
      id: "content-slug"
    }
  });
  const [bodyState, bodyCmds] = RichMarkdownEditor.init({
    errors: [],
    validate: contentValidation.validateBody,
    child: {
      value: content?.body || "",
      id: "content-body",
      uploadImage: api.files.markdownImages.makeUploadImage()
    }
  });
  return [
    {
      content,
      title: immutable(titleState),
      slug: immutable(slugState),
      body: immutable(bodyState)
    },
    [
      ...component_.cmd.mapMany(titleCmds, (msg) => adt("title", msg) as Msg),
      ...component_.cmd.mapMany(slugCmds, (msg) => adt("slug", msg) as Msg),
      ...component_.cmd.mapMany(bodyCmds, (msg) => adt("body", msg) as Msg)
    ]
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "title":
      return component_.base.updateChild({
        state,
        childStatePath: ["title"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("title", value)
      });
    case "slug":
      return component_.base.updateChild({
        state,
        childStatePath: ["slug"],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("slug", value)
      });
    case "body":
      return component_.base.updateChild({
        state,
        childStatePath: ["body"],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt("body", value)
      });
  }
};

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: component_.base.View<Props> = ({
  state,
  dispatch,
  disabled
}) => {
  const slug = FormField.getValue(state.slug);
  return (
    <div>
      <Row>
        <Col xs="12" md="9" lg="8">
          <ShortText.view
            extraChildProps={{}}
            label="Title"
            placeholder="Title"
            required
            disabled={disabled}
            state={state.title}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("title" as const, value)
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="9" lg="8">
          <ShortText.view
            extraChildProps={{}}
            label="Slug"
            placeholder="Slug, e.g. an-example-slug-123"
            help={`A page slug determines the URL that people will use to access the page. A valid slug must start with a lowercase character or number, and can subsequently contain lowercase characters, numbers or hyphens (i.e. "-"). For example, "this-is-a-valid-slug123".`}
            hint={
              slug ? (
                <span>
                  This page {state.content?.slug !== slug ? "will be" : "is"}{" "}
                  available at <b>{slugPath(slug)}</b>.
                </span>
              ) : undefined
            }
            required={!state.content?.fixed}
            disabled={disabled || !!state.content?.fixed}
            state={state.slug}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("slug" as const, value)
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col xs="12" md="9" lg="8">
          <RichMarkdownEditor.view
            label="Body"
            placeholder={`Enter the page's body here.`}
            help={`Please enter the page's body in the provided text area. It can be formatted using Markdown.`}
            extraChildProps={{
              style: { height: "60vh", minHeight: "400px" }
            }}
            required
            disabled={disabled}
            state={state.body}
            dispatch={component_.base.mapDispatch(dispatch, (value) =>
              adt("body" as const, value)
            )}
          />
        </Col>
      </Row>
    </div>
  );
};
