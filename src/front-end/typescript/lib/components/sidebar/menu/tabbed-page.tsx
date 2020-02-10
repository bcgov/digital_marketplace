import { Route } from 'front-end/lib/app/types';
import { GlobalComponentMsg, Immutable, Init, PageComponent } from 'front-end/lib/framework';
import { AvailableIcons } from 'front-end/lib/views/icon';

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
