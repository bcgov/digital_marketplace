import { DROPDOWN_CARET_SIZE } from 'front-end/config';
import { Component, ComponentViewProps, Immutable, Init, Update, View, ViewElementChildren } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import Link, { emptyIconLinkSymbol, iconLinkSymbol, leftPlacement, rightPlacement } from 'front-end/lib/views/link';
import React from 'react';
import { Dropdown, DropdownMenu, DropdownToggle, Nav } from 'reactstrap';
import { ADT, adt } from 'shared/lib/types';

export interface State<TabId> {
  isDropdownOpen: boolean;
  activeTab: TabId;
  tabs: TabId[];
}

export interface Params<TabId> extends Pick<State<TabId>, 'tabs'> {
  activeTab?: TabId;
}

export type Msg<TabId>
  = ADT<'toggleDropdown'>
  | ADT<'setActiveTab', TabId>
  | ADT<'next'>
  | ADT<'previous'>;

export function getActiveTab<TabId>(state: Immutable<State<TabId>>): TabId {
  return state.activeTab;
}

function getActiveTabIndex<TabId>(state: Immutable<State<TabId>>): number {
  return state.tabs.indexOf(getActiveTab(state));
}

function getNextTab<TabId>(state: Immutable<State<TabId>>): TabId | null {
  const index = getActiveTabIndex(state);
  return index !== -1 && index < state.tabs.length - 1 ? state.tabs[index + 1] : null;
}

function showNextButton<TabId>(state: Immutable<State<TabId>>): boolean {
  return !!getNextTab(state);
}

function getPreviousTab<TabId>(state: Immutable<State<TabId>>): TabId | null {
  const index = getActiveTabIndex(state);
  return index !== -1 && index > 0 ? state.tabs[index - 1] : null;
}

function showPreviousButton<TabId>(state: Immutable<State<TabId>>): boolean {
  return !!getPreviousTab(state);
}

export function init<TabId>(): Init<Params<TabId>, State<TabId>> {
  return async ({ tabs, activeTab }) => {
    if (!tabs.length) { throw new Error('Must provide a non-empty array of tabs for tabbed forms.'); }
    return {
      tabs,
      isDropdownOpen: false,
      activeTab: activeTab || tabs[0]
    };
  };
}

export function update<TabId>(): Update<State<TabId>, Msg<TabId>> {
  return ({ state, msg }) => {
    switch (msg.tag) {
      case 'toggleDropdown':
        return [state.update('isDropdownOpen', v => !v)];
      case 'setActiveTab':
        return [state.set('activeTab', msg.value)];
      case 'next':
        return [state.set('activeTab', getNextTab(state) || state.activeTab)];
      case 'previous':
        return [state.set('activeTab', getPreviousTab(state) || state.activeTab)];
      default:
        return [state];
    }
  };
}

export interface Props<TabId> extends ComponentViewProps<State<TabId>, Msg<TabId>> {
  valid: boolean;
  disabled?: boolean;
  children: ViewElementChildren;
  getTabLabel(tabId: TabId): string;
  isTabValid(tabId: TabId): boolean;
}

const WarningIcon: View<{}> = () => {
  return (<Icon name='exclamation-circle' color='warning' className='mr-2' />);
};

export function view<TabId>(): View<Props<TabId>> {
  const Header: View<Props<TabId>> = ({ valid, disabled, state, dispatch, getTabLabel, isTabValid }) => {
    const activeTab = getActiveTab(state);
    if (!activeTab) { return null; }
    return (
      <div className='d-flex mb-5'>
        <Nav tabs className='flex-grow-1 flex-nowrap'>
          <Dropdown nav isOpen={state.isDropdownOpen} toggle={() => dispatch(adt('toggleDropdown'))}>
            <DropdownToggle tag='div' className='d-flex align-items-center flex-nowrap'>
              {valid ? null : (<WarningIcon />)}
              <Link
                symbol_={rightPlacement(iconLinkSymbol('caret'))}
                symbolClassName='mr-n1'
                className='dropdown-toggle'
                iconSymbolSize={DROPDOWN_CARET_SIZE}
                disabled={disabled}
                color='body'>
                {getTabLabel(activeTab)}
              </Link>
            </DropdownToggle>
            <DropdownMenu>
              {state.tabs.map((tab, i) => (
                <div key={`form-tab-dropdown-item-${i}`} className='dropdown-item d-flex align-items-center flex-nowrap'>
                  <Link
                    symbol_={leftPlacement(isTabValid(tab) ? emptyIconLinkSymbol() : iconLinkSymbol('exclamation-circle'))}
                    symbolClassName='text-warning'
                    onClick={() => dispatch(adt('setActiveTab', tab))}
                    color='body'>
                    {getTabLabel(tab)}
                  </Link>
                </div>
              ))}
            </DropdownMenu>
          </Dropdown>
        </Nav>
      </div>
    );
  };

  const Footer: View<Props<TabId>> = ({ state, dispatch }) => {
    return (
      <div>
        {showNextButton(state)
          ? (<Link button outline color='primary' symbol_={rightPlacement(iconLinkSymbol('paperclip'))} onClick={() => dispatch(adt('next'))}>Next</Link>)
          : null}
        {showPreviousButton(state)
          ? (<Link button outline color='info' symbol_={leftPlacement(iconLinkSymbol('paperclip'))} onClick={() => dispatch(adt('previous'))}>Previous</Link>)
          : null}
      </div>
    );
  };

  return props => {
    return (
      <div>
        <Header {...props} />
        <div>
          {props.children}
        </div>
        <Footer {...props} />
      </div>
    );
  };
}

export function makeComponent<TabId>(): Component<Params<TabId>, State<TabId>, Msg<TabId>, Props<TabId>> {
  return {
    init: init(),
    update: update(),
    view: view()
  };
}
