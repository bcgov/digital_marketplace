/**
 * This module exports primitives to create complex pages
 * that use the menu sidebar and need to compose child
 * components (referred to as "tabs").
 */

import { makePageMetadata } from "front-end/lib";
import { Route } from "front-end/lib/app/types";
import * as MenuSidebar from "front-end/lib/components/sidebar/menu";
import { component, Immutable } from "front-end/lib/framework";
import { AvailableIcons } from "front-end/lib/views/icon";
import React from "react";
import { adt, ADT } from "shared/lib/types";

// Types & functions to assist with constructing TabComponents inside a PageComponent.

export interface TabComponent<Params, State, InnerMsg, Response>
  extends Omit<
    component.page.Component<never, never, State, InnerMsg, Route>,
    "init" | "getMetadata"
  > {
  init: component.base.Init<Params, State, component.page.Msg<InnerMsg, Route>>;
  onInitResponse(response: Response): InnerMsg;
}

export interface Tab<Params, State, InnerMsg, Response> {
  params: Params;
  state: State;
  innerMsg: InnerMsg;
  response: Response;
}

type TabsRecord<T> = Record<
  keyof T,
  Tab<unknown, unknown, ADT<unknown, unknown>, unknown>
>;

type Tabs<T extends TabsRecord<T>> = T;

export type TabId<T extends TabsRecord<T>> = keyof Tabs<T>;

export type TabState<T extends TabsRecord<T>, K extends TabId<T>> = [
  K,
  Immutable<Tabs<T>[K]["state"]>
];

export type TabMsg<
  T extends TabsRecord<T>,
  K extends TabId<T>
> = component.page.Msg<Tabs<T>[K]["innerMsg"], Route>;

export interface TabDefinition<T extends TabsRecord<T>, K extends TabId<T>> {
  component: TabComponent<
    Tabs<T>[K]["params"],
    Tabs<T>[K]["state"],
    Tabs<T>[K]["innerMsg"],
    Tabs<T>[K]["response"]
  >;
  icon: AvailableIcons;
  title: string;
}

export type ParseTabId<T extends TabsRecord<T>> = (
  raw: unknown
) => TabId<T> | null;

export type IdToDefinition<T extends TabsRecord<T>, K extends TabId<T>> = (
  id: K
) => TabDefinition<T, K>;

export type IdToDefinitionWithState<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState
> = (
  state: Immutable<ExtraState & ParentState<T, K>>
) => (id: K) => TabDefinition<T, K>;

// Types & functions to assist with constructing parents of TabComponents.

export interface ParentState<T extends TabsRecord<T>, K extends TabId<T>> {
  tab: TabState<T, K> | null;
  sidebar: Immutable<MenuSidebar.State> | null;
}

export type ParentInnerMsg<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  InnerMsg
> = ADT<"tab", TabMsg<T, K>> | ADT<"sidebar", MenuSidebar.Msg> | InnerMsg;

export type ParentMsg<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  InnerMsg
> = component.page.Msg<ParentInnerMsg<T, K, InnerMsg>, Route>;

export function makeGetParentModal<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
>(
  idToDefinition: IdToDefinitionWithState<T, K, ExtraState>
): component.page.GetModal<
  ExtraState & ParentState<T, K>,
  ParentMsg<T, K, InnerMsg>
> {
  return (state): component.page.Modal<ParentMsg<T, K, InnerMsg>> => {
    if (!state.tab) return component.page.modal.hide();
    const tabId = state.tab[0];
    const definition = idToDefinition(state)(tabId);
    if (!definition.component.getModal) {
      return component.page.modal.hide();
    } else {
      return component.page.modal.map(
        definition.component.getModal(state.tab[1]),
        (v) => adt("tab" as const, v)
      );
    }
  };
}

export function makeGetParentActions<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
>(
  idToDefinition: IdToDefinitionWithState<T, K, ExtraState>
): component.page.GetActions<
  ExtraState & ParentState<T, K>,
  ParentMsg<T, K, InnerMsg>
> {
  return ({ state, dispatch }) => {
    if (!state.tab) return component.page.actions.none();
    const tabId = state.tab[0];
    const definition = idToDefinition(state)(tabId);
    if (!definition.component.getActions) {
      return component.page.actions.none();
    }
    return definition.component.getActions({
      state: state.tab[1],
      dispatch: component.base.mapDispatch(dispatch, (v) =>
        adt("tab" as const, v)
      )
    });
  };
}

interface MakeGetParentMetadataParams<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState
> {
  idToDefinition: IdToDefinitionWithState<T, K, ExtraState>;
  getTitleSuffix(state: Immutable<ExtraState & ParentState<T, K>>): string;
}

export function makeGetParentMetadata<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState
>(
  params: MakeGetParentMetadataParams<T, K, ExtraState>
): component.page.GetMetadata<ExtraState & ParentState<T, K>> {
  return (state) => {
    if (!state.tab) return makePageMetadata(params.getTitleSuffix(state));
    return makePageMetadata(
      `${
        params.idToDefinition(state)(state.tab[0]).title
      } — ${params.getTitleSuffix(state)}`
    );
  };
}

export function makeGetParentAlerts<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
>(
  idToDefinition: IdToDefinitionWithState<T, K, ExtraState>
): component.page.GetAlerts<
  ExtraState & ParentState<T, K>,
  ParentMsg<T, K, InnerMsg>
> {
  return (state) => {
    if (!state.tab) return component.page.alerts.empty();
    const tabId = state.tab[0];
    const definition = idToDefinition(state)(tabId);
    if (!definition.component.getAlerts) {
      return component.page.alerts.empty();
    }
    return component.page.alerts.map(
      definition.component.getAlerts(state.tab[1]),
      (msg) => adt("tab" as const, msg)
    );
  };
}

export function makeParentSidebar<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
>(): component.page.Sidebar<
  ExtraState & ParentState<T, K>,
  ParentMsg<T, K, InnerMsg>
> {
  return {
    size: "medium",
    color: "light",
    isEmptyOnMobile: (state) => {
      return !state.sidebar?.items.length;
    },
    view: ({ state, dispatch }) => {
      const sidebar = state.sidebar;
      if (!sidebar) return null;
      return (
        <MenuSidebar.view
          state={sidebar as Immutable<MenuSidebar.State>}
          dispatch={component.base.mapDispatch(dispatch, (msg) =>
            adt("sidebar" as const, msg)
          )}
        />
      );
    }
  };
}

type ParentExtraUpdate<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
> = component.base.Update<
  ExtraState & ParentState<T, K>,
  ParentMsg<T, K, InnerMsg>
>;

interface MakeParentUpdateParams<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
> {
  extraUpdate: ParentExtraUpdate<T, K, ExtraState, InnerMsg>;
  idToDefinition: IdToDefinitionWithState<T, K, ExtraState>;
}

export function makeParentUpdate<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg extends ADT<unknown, unknown>
>(
  params: MakeParentUpdateParams<T, K, ExtraState, InnerMsg>
): component.page.Update<
  ExtraState & ParentState<T, K>,
  ParentInnerMsg<T, K, InnerMsg>,
  Route
> {
  return ({
    state,
    msg
  }: component.page.UpdateParams<
    ExtraState & ParentState<T, K>,
    ParentInnerMsg<T, K, InnerMsg>,
    Route
  >) => {
    switch (msg.tag) {
      case "tab": {
        if (!state.tab) return [state, []];
        const tabId = state.tab[0];
        const definition = params.idToDefinition(state)(tabId);
        return component.base.updateChild({
          state,
          childStatePath: ["tab", "1"],
          childUpdate: definition.component.update,
          childMsg: msg.value as component.page.Msg<T[K]["innerMsg"], Route>,
          mapChildMsg: (msg1) =>
            component.page.mapMsg(msg1, (msg2) =>
              adt("tab" as const, msg2 as TabMsg<T, K>)
            )
        });
      }
      case "sidebar":
        return component.base.updateChild({
          state,
          childStatePath: ["sidebar"],
          childUpdate: MenuSidebar.update,
          childMsg: msg.value as MenuSidebar.Msg,
          mapChildMsg: (value) =>
            adt("sidebar", value) as ParentMsg<T, K, InnerMsg>
        });
      default:
        return params.extraUpdate({
          state,
          msg: msg as component.page.Msg<InnerMsg, Route>
        });
    }
  };
}

export function makeParentView<
  T extends TabsRecord<T>,
  K extends TabId<T>,
  ExtraState,
  InnerMsg
>(
  idToDefinition: IdToDefinitionWithState<T, K, ExtraState>
): component.page.View<
  ExtraState & ParentState<T, K>,
  ParentInnerMsg<T, K, InnerMsg>,
  Route
> {
  return function TabWrapper({ state, dispatch }) {
    const tab = state.tab;
    if (!tab) return null;
    const tabId = tab[0];
    const tabState = tab[1];
    const definition = idToDefinition(state)(tabId);
    return (
      <definition.component.view
        dispatch={component.base.mapDispatch(dispatch, (v) =>
          adt("tab" as const, v)
        )}
        state={tabState}
      />
    );
  };
}
