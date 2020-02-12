/**
 * This module exports primitives to create complex pages
 * that use the menu sidebar and need to compose child
 * components (referred to as "tabs").
 */

import { makePageMetadata } from 'front-end/lib';
import { Route } from 'front-end/lib/app/types';
import * as MenuSidebar from 'front-end/lib/components/sidebar/menu';
import { ComponentView, emptyPageAlerts, GlobalComponentMsg, Immutable, Init, mapComponentDispatch, mapPageAlerts, mapPageModalMsg, PageComponent, PageGetAlerts, PageGetContextualActions, PageGetMetadata, PageGetModal, PageSidebar, Update, updateComponentChild, updateGlobalComponentChild } from 'front-end/lib/framework';
import { AvailableIcons } from 'front-end/lib/views/icon';
import React from 'react';
import { adt, ADT } from 'shared/lib/types';

// Types & functions to assist with constructing TabComponents inside a PageComponent.

export interface TabComponent<Params, State, Msg> extends Omit<PageComponent<never, never, State, Msg>, 'init' | 'getMetadata'> {
  init: Init<Params, State>;
}

export interface Tab<Params, State, InnerMsg> {
  params: Params;
  state: State;
  innerMsg: InnerMsg;
}

type TabsRecord<T> = Record<keyof T, Tab<unknown, unknown, unknown>>;

type Tabs<T extends TabsRecord<T>> = T;

export type TabId<T extends TabsRecord<T>> = keyof Tabs<T>;

export type TabState<T extends TabsRecord<T>, K extends TabId<T>> = [K, Immutable<Tabs<T>[K]['state']>];

export type TabMsg<T extends TabsRecord<T>, K extends TabId<T>> = GlobalComponentMsg<Tabs<T>[K]['innerMsg'], Route>;

export interface TabDefinition<T extends TabsRecord<T>, K extends TabId<T>> {
  component: TabComponent<Tabs<T>[K]['params'], Tabs<T>[K]['state'], GlobalComponentMsg<Tabs<T>[K]['innerMsg'], Route>>;
  icon: AvailableIcons;
  title: string;
}

export type ParseTabId<T extends TabsRecord<T>> = (raw: unknown) => TabId<T> | null;

export type IdToDefinition<T extends TabsRecord<T>, K extends TabId<T>> = (id: K) => TabDefinition<T, K>;

// Types & functions to assist with constructing parents of TabComponents.

export interface ParentState<T extends TabsRecord<T>, K extends TabId<T>> {
  tab: TabState<T, K>;
  sidebar: Immutable<MenuSidebar.State>;
}

export type ParentMsg<T extends TabsRecord<T>, K extends TabId<T>, InnerMsg>
  = GlobalComponentMsg<ADT<'tab', TabMsg<T, K>> | ADT<'sidebar', MenuSidebar.Msg> | InnerMsg, Route>;

export function makeGetParentModal<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
  >(idToDefinition: IdToDefinition<T, K>): PageGetModal<ExtraState & ParentState<T, K>, ParentMsg<T, K, InnerMsg>> {
  return state => {
    const tabId = state.tab[0];
    const definition = idToDefinition(tabId);
    if (!definition.component.getModal) { return null; }
    return mapPageModalMsg(
      definition.component.getModal(state.tab[1]),
      v => adt('tab', v)
    );
  };
}

export function makeGetParentContextualActions<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
  >(idToDefinition: IdToDefinition<T, K>): PageGetContextualActions<ExtraState & ParentState<T, K>, ParentMsg<T, K, InnerMsg>> {
  return ({ state, dispatch }) => {
    const tabId = state.tab[0];
    const definition = idToDefinition(tabId);
    if (!definition.component.getContextualActions) { return null; }
    return definition.component.getContextualActions({
      state: state.tab[1],
      dispatch: mapComponentDispatch(dispatch, v => adt('tab' as const, v))
    });
  };
}

interface MakeGetParentMetadataParams<T extends TabsRecord<T>, K extends TabId<T>, ExtraState> {
  idToDefinition: IdToDefinition<T, K>;
  getTitleSuffix(state: Immutable<ExtraState & ParentState<T, K>>): string;
}

export function makeGetParentMetadata<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState
  >(params: MakeGetParentMetadataParams<T, K, ExtraState>): PageGetMetadata<ExtraState & ParentState<T, K>> {
  return state => {
    return makePageMetadata(`${params.idToDefinition(state.tab[0]).title} — ${params.getTitleSuffix(state)}`);
  };
}

export function makeGetParentAlerts<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
  >(idToDefinition: IdToDefinition<T, K>): PageGetAlerts<ExtraState & ParentState<T, K>, ParentMsg<T, K, InnerMsg>> {
  return state => {
    const tabId = state.tab[0];
    const definition = idToDefinition(tabId);
    if (!definition.component.getAlerts) { return emptyPageAlerts(); }
    return mapPageAlerts(
      definition.component.getAlerts(state.tab[1]),
      msg => adt('tab' as const, msg)
    );
  };
}

export function makeParentSidebar<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
  >(): PageSidebar<ExtraState & ParentState<T, K>, ParentMsg<T, K, InnerMsg>> {
  return {
    size: 'medium',
    color: 'light',
    isEmptyOnMobile: state => {
      return !state.sidebar.links.length;
    },
    view: ({ state, dispatch }) => {
      return (<MenuSidebar.view
        state={state.sidebar}
        dispatch={mapComponentDispatch(dispatch, msg => adt('sidebar' as const, msg))} />);
    }
  };
}

type ParentExtraUpdate<T extends TabsRecord<T>, K extends TabId<T>, ExtraState, InnerMsg extends ADT<any, any>>
  = Update<ExtraState & ParentState<T, K>, GlobalComponentMsg<InnerMsg, Route>>;

interface MakeParentUpdateParams<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg extends ADT<any, any>
  > {
  extraUpdate: ParentExtraUpdate<T, K, ExtraState, InnerMsg>;
  idToDefinition: IdToDefinition<T, K>;
}

export function makeParentUpdate<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg extends ADT<any, any>
  >(params: MakeParentUpdateParams<T, K, ExtraState, InnerMsg>): Update<ExtraState & ParentState<T, K>, ParentMsg<T, K, InnerMsg>> {
  return ({ state, msg }) => {
    switch (msg.tag) {
      case 'tab':
        const tabId = state.tab[0];
        const definition = params.idToDefinition(tabId);
        return updateGlobalComponentChild({
          state,
          childStatePath: ['tab', '1'],
          childUpdate: definition.component.update,
          childMsg: msg.value,
          mapChildMsg: value => adt('tab' as const, value as TabMsg<T, K>)
        });
      case 'sidebar':
        return updateComponentChild({
          state,
          childStatePath: ['sidebar'],
          childUpdate: MenuSidebar.update,
          childMsg: msg.value,
          mapChildMsg: value => adt('sidebar' as const, value)
        });
      default:
        return params.extraUpdate({
          state,
          msg: msg as GlobalComponentMsg<InnerMsg, Route>
        });
    }
  };
}

export function makeParentView<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
  >(idToDefinition: IdToDefinition<T, K>): ComponentView<ExtraState & ParentState<T, K>, ParentMsg<T, K, InnerMsg>> {
  return ({ state, dispatch }) => {
    const [tabId, tabState] = state.tab;
    const definition = idToDefinition(tabId);
    return (
      <definition.component.view
        dispatch={mapComponentDispatch(dispatch, v => adt('tab' as const, v))}
        state={tabState} />
      );
  };
}
