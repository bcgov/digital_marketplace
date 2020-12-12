import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import * as ShortText from 'front-end/lib/components/form-field/short-text';
import { ComponentViewProps, Immutable, immutable, Init, mapComponentDispatch, Update, updateComponentChild, View } from 'front-end/lib/framework';
import * as api from 'front-end/lib/http/api';
import React from 'react';
import { Col, Row } from 'reactstrap';
import { Content } from 'shared/lib/resources/content';
import { adt, ADT } from 'shared/lib/types';
import * as contentValidation from 'shared/lib/validation/content';

export interface State {
  content: Content | null;
  title: Immutable<ShortText.State>;
  slug: Immutable<ShortText.State>;
  body: Immutable<RichMarkdownEditor.State>;
}

export type Msg
  = ADT<'title', ShortText.Msg>
  | ADT<'slug', ShortText.Msg>
  | ADT<'body', RichMarkdownEditor.Msg>;

export interface Params {
  content?: Content;
}

export const init: Init<Params, State> = async ({ content = null }) => {
  return {
    content,
    title: immutable(await ShortText.init({
      errors: [],
      validate: contentValidation.validateTitle,
      child: {
        type: 'text',
        value: content?.title || '',
        id: 'content-title'
      }
    })),
    slug: immutable(await ShortText.init({
      errors: [],
      validate: contentValidation.validateSlug,
      child: {
        type: 'text',
        value: content?.slug || '',
        id: 'content-slug'
      }
    })),
    body: immutable(await RichMarkdownEditor.init({
      errors: [],
      validate: contentValidation.validateBody,
      child: {
        value: content?.body || '',
        id: 'content-body',
        uploadImage: api.makeUploadMarkdownImage()
      }
    }))
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'title':
      return updateComponentChild({
        state,
        childStatePath: ['title'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('title', value)
      });
    case 'slug':
      return updateComponentChild({
        state,
        childStatePath: ['slug'],
        childUpdate: ShortText.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('slug', value)
      });
    case 'body':
      return updateComponentChild({
        state,
        childStatePath: ['body'],
        childUpdate: RichMarkdownEditor.update,
        childMsg: msg.value,
        mapChildMsg: (value) => adt('body', value)
      });
  }
};

export interface Props extends ComponentViewProps<State, Msg> {
  disabled?: boolean;
}

export const view: View<Props> = ({ state, dispatch, disabled }) => {
  return (
    <div>
      <Row>
        <Col xs='12' md='9' lg='8'>
          <ShortText.view
            extraChildProps={{}}
            label='Page Title'
            placeholder='Page Title'
            required
            disabled={disabled}
            state={state.title}
            dispatch={mapComponentDispatch(dispatch, value => adt('title' as const, value))} />
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='9' lg='8'>
          <ShortText.view
            extraChildProps={{}}
            label='Slug'
            placeholder='example-slug'
            required
            disabled={disabled || !!state.content?.fixed}
            state={state.slug}
            dispatch={mapComponentDispatch(dispatch, value => adt('slug' as const, value))} />
        </Col>
      </Row>
      <Row>
        <Col xs='12' md='9' lg='8'>
          <RichMarkdownEditor.view
            extraChildProps={{}}
            label='Page Body'
            placeholder={`Enter the page's body here.`}
            help={`Please enter the page's body in the provided text area. It can be formatted using Markdown.`}
            required
            disabled={disabled || !!state.content?.fixed}
            state={state.body}
            dispatch={mapComponentDispatch(dispatch, value => adt('body' as const, value))} />
        </Col>
      </Row>
    </div>
  );
};
