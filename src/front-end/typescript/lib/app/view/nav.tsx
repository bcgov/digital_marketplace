import { TRANSITION_DURATION } from 'front-end/config';
import { ComponentViewProps, Dispatch, Init, Update, View } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import Link, { Dest, Props as LinkProps } from 'front-end/lib/views/link';
import React, { Fragment } from 'react';
import { Col, Container, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row, Spinner } from 'reactstrap';
import { ADT, adt, adtCurried } from 'shared/lib/types';
export type Params = null;

export interface State {
  isDesktopAccountDropdownOpen: boolean;
  isMobileMenuOpen: boolean;
}

export type Msg
  = ADT<'toggleDesktopAccountDropdown', boolean | undefined>
  | ADT<'toggleMobileMenu', boolean | undefined>;

export const init: Init<Params, State> = async () => {
  return {
    isDesktopAccountDropdownOpen: false,
    isMobileMenuOpen: false
  };
};

export const update: Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case 'toggleDesktopAccountDropdown':
      return [state.update('isDesktopAccountDropdownOpen', v => msg.value === undefined ? !v : msg.value)];
    case 'toggleMobileMenu':
      return [state.update('isMobileMenuOpen', v => msg.value === undefined ? !v : msg.value)];
  }
};

interface NavLinkInfo {
  text: string;
  active?: boolean;
}

export type NavLink = LinkProps & NavLinkInfo;

type NavLinkProps = NavLink & { dispatch: Dispatch<Msg>; };

const NavLink: View<NavLinkProps> = props => {
  const { text, active = false } = props;
  const onClick = () => {
    props.dispatch(adt('toggleMobileMenu', false));
    props.dispatch(adt('toggleDesktopAccountDropdown', false));
    if (props.onClick) { return props.onClick(); }
  };
  const linkProps = { ...props };
  linkProps.color = linkProps.color || 'white';
  return (
    <Link
      {...linkProps}
      onClick={onClick}
      className={`d-block ${props.className || ''} ${active ? 'font-weight-bold' : ''}`}>
      {text}
    </Link>
  );
};

interface NavDropdownLinkGroup {
  label?: string;
  links: NavLink[];
}

interface NavDropdown {
  imageUrl: string;
  linkGroups: NavDropdownLinkGroup[];
}

const NavDropdown: View<NavDropdown & { dispatch: Dispatch<Msg>; open: boolean; }> = props => {
  const { imageUrl, linkGroups, open, dispatch } = props;
  const toggleOpen = () => dispatch(adt('toggleDesktopAccountDropdown'));
  return (
    <Dropdown isOpen={open} toggle={toggleOpen}>
      <DropdownToggle caret tag='div' className='text-white' style={{ cursor: 'pointer' }}>
        <img
          src={imageUrl}
          className='rounded-circle'
          style={{
            width: '2.75rem',
            height: '2.75rem',
            objectFit: 'cover'
          }} />
      </DropdownToggle>
      <DropdownMenu right>
        {linkGroups.map((group, i) => (
          <Fragment key={`nav-dropdown-group-${i}`}>
            {group.label ? (<DropdownItem header>{group.label}</DropdownItem>) : null}
            {group.links.map((link, j) => (
              <NavLink {...link} className={`${link.className || ''} dropdown-item`} button={false} color='body' dispatch={dispatch} key={`nav-dropdown-link-${i}-${j}`} />
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

interface AccountActionProps {
  className?: string;
  action: AccountAction;
  dispatch: Dispatch<Msg>;
}

const AccountAction: View<AccountActionProps> = ({ className = '', action, dispatch }) => {
  switch (action.tag) {
    case 'text':
      return (<div className={`${className} o-50 text-white`}>{action.value}</div>);
    case 'link':
      return (<NavLink className={className} {...action.value} dispatch={dispatch} />);
  }
};

type UnauthenticatedAccountMenu = ADT<'unauthenticated', AccountAction[]>;
export const unauthenticatedAccountMenu = adtCurried<UnauthenticatedAccountMenu>('unauthenticated');

type AuthenticatedDesktopAccountMenu = ADT<'authenticated', { email: string; dropdown: NavDropdown; }>;
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
  contextualLinks?: {
    left: NavLink[];
    right: NavLink[];
  };
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
          <div className='text-white o-50 mr-3'>{menu.value.email}</div>
          <NavDropdown {...menu.value.dropdown} open={state.isDesktopAccountDropdownOpen} dispatch={dispatch} />
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
        return (
          <AccountAction
            action={clonedAction}
            className={`${i !== menu.value.length - 1 ? marginClassName : ''} ${isAccountActionActive(action) ? 'o-100 font-weight-bold' : 'o-75'}`}
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
      text={title}
      color='white'
      dest={homeDest}
      style={{ pointerEvents: homeDest ? undefined : 'none' }}
      className='font-weight-bolder font-size-large' />
  </div>
);

const TopNavbar: View<Props> = props => {
  const { state, dispatch, isLoading } = props;
  return (
    <div
      className='main-nav-top bg-info border-bottom-gov w-100'>
      <Container className='h-100'>
        <Row className='h-100'>
          <Col xs='12' className='h-100 d-flex flex-nowrap align-items-center justify-content-between'>
            <div className='d-flex align-items-center flex-grow-1'>
              <Link dest={props.homeDest} style={{ pointerEvents: props.homeDest ? undefined : 'none' }} className='align-self-stretch d-flex align-items-center'>
                <img src={props.logoImageUrl} style={{ height: '44px' }} />
              </Link>
              <Title title={props.title} homeDest={props.homeDest} dispatch={dispatch} className='ml-n2 mr-3 d-none d-md-block' />
              {isLoading
                ? (<Spinner size='sm' color='info-alt' className='transition-indicator' />)
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
  );
};

const DesktopBottomNavbar: View<Props> = props => {
  const { contextualLinks } = props;
  if (!contextualLinks) { return null; }
  return (
    <div className='bg-info-alt py-3 d-none d-md-block shadow'>
      <Container className='h-100'>
        <Row className='h-100'>
          <Col xs='12' className='h-100 d-flex flex-nowrap align-items-center justify-content-between'>
            <div className='d-flex flex-nowrap'>
              {contextualLinks.left.map((link, i) => (
                <div className={`${i < contextualLinks.left.length - 1 ? 'pr-3 mr-3 border-right border-info' : ''}`} key={`contextual-link-left-${i}`}>
                  <NavLink
                    {...link}
                    dispatch={props.dispatch}
                    color='white'
                    className={link.active ? 'o-100 font-weight-bold' : 'o-75'} />
                </div>
              ))}
            </div>
            <div className='d-flex flex-nowrap'>
              {contextualLinks.right.map((link, i) => (
                <div className={`${i < contextualLinks.right.length - 1 ? 'pr-3 mr-3 border-right border-info' : ''}`} key={`contextual-link-right-${i}`}>
                  <NavLink
                    {...link}
                    dispatch={props.dispatch}
                    color='white'
                    className={link.active ? 'o-100 font-weight-bold' : 'o-75'} />
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const MobileBottomNavbar: View<Props> = props => {
  const isMobileMenuOpen = props.state.isMobileMenuOpen;
  const { contextualLinks } = props;
  return (
    <div
      className={`bg-info-alt ${isMobileMenuOpen ? 'py-4 shadow' : 'py-0'} d-md-none overflow-hidden`}
      style={{
        transition: `max-height linear ${TRANSITION_DURATION}ms, padding linear ${TRANSITION_DURATION}ms`,
        maxHeight: isMobileMenuOpen ? '1000px' : 0
      }}>
      <Container>
        <Row>
          <Col xs='12'>
            <Title title={props.title} homeDest={props.homeDest} dispatch={props.dispatch} className='d-inline-block mb-4' />
          </Col>
        </Row>
        {contextualLinks && contextualLinks.left.length
          ? (<Row>
              <Col xs='12'>
                <div className='pb-4 border-bottom mb-4 d-flex flex-column align-items-start'>
                  {contextualLinks.left.map((link, i) => (
                    <NavLink
                      {...link}
                      dispatch={props.dispatch}
                      color='white'
                      className={`${link.active ? 'o-100 font-weight-bold' : 'o-75'} ${i < contextualLinks.left.length - 1 ? 'mb-3' : ''}`}
                      key={`mobile-contextual-link-left-${i}`} />
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
        {contextualLinks && contextualLinks.right.length
          ? (<Row>
              <Col xs='12'>
                <div className='pt-4 border-top mt-4 d-flex flex-column align-items-start'>
                  {contextualLinks.right.map((link, i) => (
                    <NavLink
                      {...link}
                      dispatch={props.dispatch}
                      color='white'
                      className={`${link.active ? 'o-100 font-weight-bold' : 'o-75'} ${i < contextualLinks.right.length - 1 ? 'mb-3' : ''}`}
                      key={`mobile-contextual-link-right-${i}`} />
                  ))}
                </div>
              </Col>
            </Row>)
          : null}
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
