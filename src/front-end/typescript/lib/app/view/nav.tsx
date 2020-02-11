import { ComponentViewProps, Dispatch, Init, PageContextualActions, PageContextualDropdown, Update, View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import Link, { Dest, ExtendProps as ExtendLinkProps, iconLinkSymbol, rightPlacement } from 'front-end/lib/views/link';
import Separator from 'front-end/lib/views/separator';
import React, { Fragment } from 'react';
import { ButtonDropdown, Col, Container, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row, Spinner } from 'reactstrap';
import { ADT, adt, adtCurried } from 'shared/lib/types';
export type Params = null;

const CARET_SIZE = 0.8; //rem

export interface State {
  isDesktopAccountDropdownOpen: boolean;
  // Need to toggle each contextual dropdown for mobile/desktop
  // separately because we use media queries (CSS) to hide/show them,
  // which means their event listeners are always on.
  // So, when trying to use the mobile dropdown, the desktop dropdown's
  // handleDocumentClick function clobbers any onClick handlers that
  // we have specified.
  isDesktopContextualDropdownOpen: boolean;
  isMobileContextualDropdownOpen: boolean;
  isMobileMenuOpen: boolean;
}

export type Msg
  = ADT<'toggleMobileMenu', boolean | undefined>
  | ADT<'toggleDesktopAccountDropdown', boolean | undefined>
  | ADT<'toggleDesktopContextualDropdown', boolean | undefined>
  | ADT<'toggleMobileContextualDropdown', boolean | undefined>;

export const init: Init<Params, State> = async () => {
  return {
    isDesktopAccountDropdownOpen: false,
    isDesktopContextualDropdownOpen: false,
    isMobileContextualDropdownOpen: false,
    isMobileMenuOpen: false
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleMobileMenu':
      return [state.update('isMobileMenuOpen', v => msg.value === undefined ? !v : msg.value)];
    case 'toggleDesktopAccountDropdown':
      return [state.update('isDesktopAccountDropdownOpen', v => msg.value === undefined ? !v : msg.value)];
    case 'toggleDesktopContextualDropdown':
      return [state.update('isDesktopContextualDropdownOpen', v => msg.value === undefined ? !v : msg.value)];
    case 'toggleMobileContextualDropdown':
      return [state.update('isMobileContextualDropdownOpen', v => msg.value === undefined ? !v : msg.value)];
  }
};

export type NavLink = ExtendLinkProps<{ active?: boolean; }>;

type NavLinkProps = NavLink & { dispatch: Dispatch<Msg>; };

const NavLink: View<NavLinkProps> = props => {
  const onClick = () => {
    props.dispatch(adt('toggleMobileMenu', false));
    props.dispatch(adt('toggleDesktopAccountDropdown', false));
    props.dispatch(adt('toggleDesktopContextualDropdown', false));
    props.dispatch(adt('toggleMobileContextualDropdown', false));
    if (props.onClick) { return props.onClick(); }
  };
  const linkProps = { ...props };
  linkProps.color = linkProps.color || 'white';
  return (
    <Link
      {...linkProps}
      onClick={onClick}
      className={`text-nowrap ${props.className || ''} ${props.active ? 'font-weight-bold' : ''}`} />
  );
};

const ContextualDropdown: View<PageContextualDropdown & { isOpen: boolean; dispatch: Dispatch<Msg>; toggle(): void; }> = props => {
  const { text, loading, linkGroups, isOpen, dispatch, toggle } = props;
  return (
    <ButtonDropdown isOpen={isOpen} toggle={() => toggle()}>
      <DropdownToggle tag='div'>
        <Link
          symbol_={rightPlacement(iconLinkSymbol('caret'))}
          symbolClassName='mr-n1'
          iconSymbolSize={CARET_SIZE}
          loading={loading}
          button
          size='sm'
          color='primary'>
          {text}
        </Link>
      </DropdownToggle>
      <DropdownMenu right>
        {linkGroups.map((group, i) => (
          <Fragment key={`nav-contextual-dropdown-group-${i}`}>
            {group.label ? (<DropdownItem header>{group.label}</DropdownItem>) : null}
            {group.links.map((link, j) => (
              <NavLink {...link} className={`${link.className || ''} dropdown-item`} button={false} color='body' dispatch={dispatch} key={`nav-contextual-dropdown-link-${i}-${j}`} />
            ))}
            {i < linkGroups.length - 1 ? (<DropdownItem divider />) : null}
          </Fragment>
        ))}
      </DropdownMenu>
    </ButtonDropdown>
  );
};

export interface NavAccountDropdown extends PageContextualDropdown {
  imageUrl: string;
}

const NavAccountDropdown: View<NavAccountDropdown & { isOpen: boolean; dispatch: Dispatch<Msg>; }> = props => {
  const { text, imageUrl, linkGroups, isOpen, dispatch } = props;
  return (
    <Dropdown isOpen={isOpen} toggle={() => dispatch(adt('toggleDesktopAccountDropdown'))}>
      <DropdownToggle tag='div' className='text-white text-hover-white' style={{ cursor: 'pointer' }}>
        <span className='mr-2 o-75'>{text}</span>
        <img
          src={imageUrl}
          className='rounded-circle'
          style={{
            width: '2.75rem',
            height: '2.75rem',
            objectFit: 'cover'
          }} />
        <Icon name='caret' color='white' className='ml-2' width={CARET_SIZE} height={CARET_SIZE} />
      </DropdownToggle>
      <DropdownMenu right>
        {linkGroups.map((group, i) => (
          <Fragment key={`nav-account-dropdown-group-${i}`}>
            {group.label ? (<DropdownItem header>{group.label}</DropdownItem>) : null}
            {group.links.map((link, j) => (
              <NavLink {...link} className={`${link.className || ''} dropdown-item`} button={false} color='body' dispatch={dispatch} key={`nav-account-dropdown-link-${i}-${j}`} />
            ))}
            {i < linkGroups.length - 1 ? (<DropdownItem divider />) : null}
          </Fragment>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

type TextAccountAction = ADT<'text', string>;
export const textLink = adtCurried<TextAccountAction>('text');

type LinkAccountAction = ADT<'link', NavLink>;
export const linkAccountAction = adtCurried<LinkAccountAction>('link');

type AccountAction = TextAccountAction | LinkAccountAction;

function isAccountActionActive(action: AccountAction): boolean {
  switch (action.tag) {
    case 'text':
      return false;
    case 'link':
      return !!action.value.active;
  }
}

function isAccountActionButton(action: AccountAction): boolean {
  switch (action.tag) {
    case 'text':
      return false;
    case 'link':
      return !!action.value.button;
  }
}

interface AccountActionProps {
  className?: string;
  action: AccountAction;
  dispatch: Dispatch<Msg>;
}

const AccountAction: View<AccountActionProps> = ({ className = '', action, dispatch }) => {
  switch (action.tag) {
    case 'text':
      return (<div className={`${className} o-75 text-white`}>{action.value}</div>);
    case 'link':
      return (<NavLink className={className} {...action.value} dispatch={dispatch} />);
  }
};

type UnauthenticatedAccountMenu = ADT<'unauthenticated', AccountAction[]>;
export const unauthenticatedAccountMenu = adtCurried<UnauthenticatedAccountMenu>('unauthenticated');

type AuthenticatedDesktopAccountMenu = ADT<'authenticated', NavAccountDropdown>;
export const authenticatedDesktopAccountMenu = adtCurried<AuthenticatedDesktopAccountMenu>('authenticated');

type AuthenticatedMobileAccountMenu = ADT<'authenticated', AccountAction[]>;
export const authenticatedMobileAccountMenu = adtCurried<AuthenticatedMobileAccountMenu>('authenticated');

type DesktopAccountMenu = AuthenticatedDesktopAccountMenu | UnauthenticatedAccountMenu;

type MobileAccountMenu = AuthenticatedMobileAccountMenu | UnauthenticatedAccountMenu;

export interface Props extends ComponentViewProps<State, Msg> {
  logoImageUrl: string;
  title: string;
  homeDest?: Dest;
  isLoading: boolean;
  accountMenus: {
    mobile: MobileAccountMenu;
    desktop: DesktopAccountMenu;
  };
  appLinks: NavLink[];
  contextualActions?: PageContextualActions;
}

const DesktopAccountMenu: View<Props> = props => {
  const { accountMenus, state, dispatch } = props;
  const menu = accountMenus.desktop;
  switch (menu.tag) {
    case 'unauthenticated':
      return (
        <Fragment>
          {menu.value.map((action, i) => (
            <AccountAction
              action={action}
              className={i !== menu.value.length - 1 ? 'mr-3' : ''}
              dispatch={dispatch}
              key={`desktop-account-menu-action-${i}`} />
            ))}
        </Fragment>
      );
    case 'authenticated':
      return (
        <Fragment>
          <NavAccountDropdown
            {...menu.value}
            isOpen={state.isDesktopAccountDropdownOpen}
            dispatch={dispatch} />
        </Fragment>
      );
  }
};

const MobileAccountMenu: View<Props> = props => {
  const menu = props.accountMenus.mobile;
  const actions = (marginClassName: string) => (
    <Fragment>
      {menu.value.map((action, i) => {
        const clonedAction = { ...action };
        if (clonedAction.tag === 'link' && clonedAction.value.button) {
          clonedAction.value = { ...clonedAction.value, size: 'sm' };
        }
        const active = isAccountActionActive(action);
        const button = isAccountActionButton(action);
        return (
          <AccountAction
            action={clonedAction}
            className={`${i !== menu.value.length - 1 ? marginClassName : ''} ${active && !button ? 'font-weight-bold' : ''}`}
            dispatch={props.dispatch}
            key={`mobile-account-menu-action-${i}`} />);
        })}
    </Fragment>
  );
  switch (menu.tag) {
    case 'unauthenticated':
      return (<div className='d-flex'>{actions('mr-3')}</div>);
    case 'authenticated':
      return (<div className='d-flex flex-column align-items-start'>{actions('mb-3')}</div>);
  }
};

interface TitleProps extends Pick<Props, 'title' | 'homeDest'> {
  dispatch: Dispatch<Msg>;
  className?: string;
}

const Title: View<TitleProps> = ({ title, homeDest, dispatch, className = '' }) => (
  <div className={className}>
    <NavLink
      dispatch={dispatch}
      children={title}
      color='white'
      dest={homeDest}
      style={{ pointerEvents: homeDest ? undefined : 'none' }}
      className='font-weight-bolder font-size-large' />
  </div>
);

const MobileMenu: View<Props> = props => {
  const isMobileMenuOpen = props.state.isMobileMenuOpen;
  const { appLinks } = props;
  const linkClassName = (link: NavLink, numLinks: number, i: number) => `${link.active && !link.button ? 'font-weight-bold' : ''} ${i < numLinks - 1 ? 'mb-3' : ''}`;
  return (
    <div className={`main-nav-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
      <Container>
        <Row>
          <Col xs='12'>
            <Title title={props.title} homeDest={props.homeDest} dispatch={props.dispatch} className='d-inline-block mb-4' />
          </Col>
        </Row>
        {appLinks.length
          ? (<Row>
              <Col xs='12'>
                <div className='pb-4 border-bottom mb-4 d-flex flex-column align-items-start'>
                  {appLinks.map((link, i) => (
                    <NavLink
                      {...link}
                      dispatch={props.dispatch}
                      color='white'
                      className={linkClassName(link, appLinks.length, i)}
                      key={`mobile-app-link-${i}`} />
                  ))}
                </div>
              </Col>
            </Row>)
          : null}
        <Row>
          <Col xs='12'>
            <MobileAccountMenu {...props} />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const TopNavbar: View<Props> = props => {
  const { state, dispatch, isLoading } = props;
  return (
    <div className='main-nav-top-navbar-wrapper'>
      <div
        className='main-nav-top-navbar'>
        <Container className='h-100'>
          <Row className='h-100'>
            <Col xs='12' className='h-100 d-flex flex-nowrap align-items-center justify-content-between'>
              <div className='d-flex align-items-center flex-grow-1'>
                <Link dest={props.homeDest} style={{ pointerEvents: props.homeDest ? undefined : 'none' }} className='align-self-stretch d-flex align-items-center'>
                  <img src={props.logoImageUrl} style={{ height: '44px' }} />
                </Link>
                <Title title={props.title} homeDest={props.homeDest} dispatch={dispatch} className='ml-n2 mr-3 d-none d-md-block' />
                {isLoading
                  ? (<Spinner size='sm' color='blue-dark-alt' className='transition-indicator' />)
                  : null}
              </div>
              <div className='d-none d-md-flex align-items-center flex-shrink-0'>
                <DesktopAccountMenu {...props} />
              </div>
              <div className='d-md-none'>
                <Icon
                  hover
                  width={1.4}
                  height={1.4}
                  name={state.isMobileMenuOpen ? 'times' : 'bars'}
                  color='white'
                  onClick={() => dispatch(adt('toggleMobileMenu'))} />
              </div>
            </Col>
          </Row>
        </Container>
      </div>
      <MobileMenu {...props} />
    </div>
  );
};

const ContextualLinks: View<Props & { isOpen: boolean; toggle(): void; }> = props => {
  const { contextualActions, dispatch, isOpen, toggle } = props;
  if (!contextualActions) { return null; }
  switch (contextualActions.tag) {
    case 'links':
      return (
        <div className='d-flex flex-nowrap align-items-center flex-row-reverse py-1 pr-1 mr-n1' style={{ overflowX: 'auto' }}>
          {contextualActions.value.map((link, i, links) => {
            const linkProps = {
              ...link,
              size: link.button ? 'sm' : undefined,
              className: `ml-3 ${link.button ? '' : 'font-size-small'}`
            } as NavLink;
            return (<NavLink {...linkProps} dispatch={dispatch} key={`contextual-link-${i}`} />);
          })}
        </div>
      );
    case 'dropdown':
      return (<div className='py-1 pr-1 mr-n1'><ContextualDropdown {...contextualActions.value} isOpen={isOpen} dispatch={dispatch} toggle={toggle} /></div>);
  }
};

const DesktopBottomNavbar: View<Props> = props => {
  const { appLinks, contextualActions } = props;
  const linkClassName = (link: NavLink) => `${link.active && !link.button ? 'font-weight-bold' : ''}`;
  if (!appLinks.length && !contextualActions) { return null; }
  return (
    <div className='main-nav-bottom-navbar desktop'>
      <Container className='h-100'>
        <Row className='h-100'>
          <Col xs='12' className='h-100 d-flex flex-nowrap align-items-center justify-content-between'>
            <div className='d-flex flex-nowrap'>
              {appLinks.map((link, i) => (
                <Fragment key={`app-link-${i}`}>
                  <NavLink
                    {...link}
                    dispatch={props.dispatch}
                    color='white'
                    className={linkClassName(link)} />
                  {i < appLinks.length - 1
                    ? (<Separator spacing='2' color='info'>|</Separator>)
                    : null}
                </Fragment>
              ))}
            </div>
            <ContextualLinks {...props} isOpen={props.state.isDesktopContextualDropdownOpen} toggle={() => props.dispatch(adt('toggleDesktopContextualDropdown'))} />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const MobileBottomNavbar: View<Props> = props => {
  const { contextualActions } = props;
  if (!contextualActions || (contextualActions.tag === 'links' && !contextualActions.value.length)) { return null; }
  return (
    <div className='main-nav-bottom-navbar mobile'>
      <Container className='h-100'>
        <Row className='h-100'>
          <Col xs='12' className='h-100 d-flex flex-nowrap align-items-center justify-content-end'>
            <ContextualLinks {...props} isOpen={props.state.isMobileContextualDropdownOpen} toggle={() => props.dispatch(adt('toggleMobileContextualDropdown'))} />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export const view: View<Props> = props => {
  return (
    <nav className='main-nav'>
      <TopNavbar {...props} />
      <DesktopBottomNavbar {...props} />
      <MobileBottomNavbar {...props} />
    </nav>
  );
};
