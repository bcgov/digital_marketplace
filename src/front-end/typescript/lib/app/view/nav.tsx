//import { PROCUREMENT_CONCIERGE_URL } from 'front-end/config';
import { ComponentViewProps, Init, Update, View } from 'front-end/lib/framework';
import Icon, { AvailableIcons } from 'front-end/lib/views/icon';
import Link, { Props as LinkProps } from 'front-end/lib/views/link';
import React, { Fragment } from 'react';
import { Col, Container, Row } from 'reactstrap';
import { ADT, adt, adtCurried } from 'shared/lib/types';
export type Params = null;

// TODO support minimal nav for sign up step two.

const TOP_NAVBAR_HEIGHT = 67; //px
//const DESKTOP_BOTTOM_NAVBAR_HEIGHT = 52; //px

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

type IconLinkSymbol = ADT<'icon', AvailableIcons>;
export const iconLinkSymbol = adtCurried<IconLinkSymbol>('icon');

type ImageLinkSymbol = ADT<'image', string>;
export const imageLinkSymbol = adtCurried<ImageLinkSymbol>('image');

type LinkSymbol = IconLinkSymbol | ImageLinkSymbol;

interface LinkSymbolProps {
  symbol_: LinkSymbol;
  className?: string;
}

const LinkSymbol: View<LinkSymbolProps> = ({ symbol_, className }) => {
  switch (symbol_.tag) {
    case 'icon':
      return (<Icon name={symbol_.value} />);
    case 'image':
      return (<img src={symbol_.value} style={{ width: '1.5rem', height: '1.5rem', objectFit: 'cover', borderRadius: '50%' }} />);
  }
};

type LeftPlacement<Value> = ADT<'left', Value>;

export function leftPlacement<Value>(value: Value): LeftPlacement<Value> {
  return adt('left', value);
}

type RightPlacement<Value> = ADT<'right', Value>;

export function rightPlacement<Value>(value: Value): RightPlacement<Value> {
  return adt('right', value);
}

type Placement<Value>
  = LeftPlacement<Value>
  | RightPlacement<Value>;

interface NavLinkInfo {
  text: string;
  symbol_?: Placement<LinkSymbol>;
  active?: boolean;
}

export type NavLink = LinkProps & NavLinkInfo;

const NavLink: View<NavLink> = props => {
  const { text, symbol_, active = false } = props;
  return (
    <Link
      {...props}
      className={`${props.className || ''} d-flex flex-nowrap align-items-center ${active ? 'font-weight-bold' : ''}`}>
      {symbol_ && symbol_.tag === 'left'
        ? (<LinkSymbol symbol_={symbol_.value} className='mr-2' />)
        : null}
      {text}
      {symbol_ && symbol_.tag === 'right'
        ? (<LinkSymbol symbol_={symbol_.value} className='ml-2' />)
        : null}
    </Link>
  );
};

interface DropdownLinkGroup {
  label?: string;
  links: NavLink[];
}

interface Dropdown {
  imageUrl: string;
  text: string;
  linkGroups: DropdownLinkGroup[];
}

const Dropdown: View<Dropdown & { open: boolean; toggleOpen(): void; }> = props => {
  return (<div></div>);
};

type TextAccountAction = ADT<'text', string>;
export const textLink = adtCurried<TextAccountAction>('text');

type LinkAccountAction = ADT<'link', NavLink>;
export const linkAccountAction = adtCurried<LinkAccountAction>('link');

type AccountAction = TextAccountAction | LinkAccountAction;

const AccountAction: View<{ action: AccountAction }> = ({ action }) => {
  switch (action.tag) {
    case 'text':
      return (<div className='o-50'>{action.value}</div>);
    case 'link':
      return (<NavLink {...action.value} />);
  }
};

type UnauthenticatedAccountMenu = ADT<'unauthenticated', AccountAction[]>;
export const unauthenticatedAccountMenu = adtCurried<UnauthenticatedAccountMenu>('unauthenticated');

type AuthenticatedDesktopAccountMenu = ADT<'authenticated', { email: string; dropdown: Dropdown; }>;
export const authenticatedDesktopAccountMenu = adtCurried<AuthenticatedDesktopAccountMenu>('authenticated');

type AuthenticatedMobileAccountMenu = ADT<'authenticated', AccountAction[]>;
export const authenticatedMobileAccountMenu = adtCurried<AuthenticatedMobileAccountMenu>('authenticated');

type DesktopAccountMenu = AuthenticatedDesktopAccountMenu | UnauthenticatedAccountMenu;

type MobileAccountMenu = AuthenticatedMobileAccountMenu | UnauthenticatedAccountMenu;

export interface Props extends ComponentViewProps<State, Msg> {
  logoImageUrl: string;
  title: string;
  isLoading: boolean;
  accountMenus: {
    mobile: MobileAccountMenu;
    desktop: DesktopAccountMenu;
  };
  contextualLinks: {
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
          {menu.value.map((action, i) => (<AccountAction action={action} key={`desktop-account-menu-action-${i}`} />))}
        </Fragment>
      );
    case 'authenticated':
      return (
        <Fragment>
          <div className='o-50 mr-3'>{menu.value.email}</div>
          <Dropdown {...menu.value.dropdown} open={state.isDesktopAccountDropdownOpen} toggleOpen={() => dispatch(adt('toggleDesktopAccountDropdown'))} />
        </Fragment>
      );
  }
};

const TopNavbar: View<Props> = props => {
  const { state, dispatch } = props;
  return (
    <div style={{ height: `${TOP_NAVBAR_HEIGHT}px` }} className='bg-info border-bottom-gov w-100'>
      <Container className='h-100'>
        <Row className='h-100'>
          <Col xs='12' className='h-100 d-flex flex-nowrap align-items-center justify-content-between'>
            <div className='d-flex align-items-center'>
              <img src={props.logoImageUrl} style={{ height: `${TOP_NAVBAR_HEIGHT - 22}px` }} />
              <div className='font-weight-bolder font-size-large text-white ml-n2'>{props.title}</div>
            </div>
            <div className='d-none d-md-flex align-items-center'>
              <DesktopAccountMenu {...props} />
            </div>
            <div className='d-md-none'>
              <Icon name={state.isMobileMenuOpen ? 'times' : 'bars'} color='white' onClick={() => dispatch(adt('toggleMobileMenu'))} />
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const DesktopBottomNavbar: View<Props> = props => {
  return (
    <div></div>
  );
};

const MobileBottomNavbar: View<Props> = props => {
  return (
    <div></div>
  );
};

export const view: View<Props> = props => {
  return (
    <nav>
      <TopNavbar {...props} />
      <DesktopBottomNavbar {...props} />
      <MobileBottomNavbar {...props} />
    </nav>
  );
};

/*interface OldProps {
  isOpen: boolean;
  activeRoute: Route;
  session?: Session;
  toggleIsOpen(open?: boolean): void;
}

const ContextualLinks: View<Props & { className?: string }> = ({ activeRoute, session, toggleIsOpen, className = '' }) => {
  const onClick = () => toggleIsOpen(false);
  const isLandingRoute = activeRoute.tag === 'landing';
  const landingRoute: Route = { tag: 'landing', value: null };

  return (
    <Nav navbar className={className}>
      <NavItem>
        <Link nav route={landingRoute} className={linkClassName(isLandingRoute)} onClick={onClick}>Home</Link>
      </NavItem>
    </Nav>
  );
};

const AuthLinks: View<Props> = ({ activeRoute, session, toggleIsOpen }) => {
  const onClick = () => toggleIsOpen(false);
  if (session && session.user) {
    const signOutRoute: Route = {
      tag: 'signOut',
      value: null
    };
    return (
      <Nav navbar className='ml-md-auto'>
        <NavItem className='d-none d-md-block'>
          <Link nav color='white' className='px-0 px-md-3' style={{ opacity: 0.35 }} disabled>{session.user.name}</Link>
        </NavItem>
        <NavItem>
          <Link nav route={signOutRoute} color='white' onClick={onClick} className='px-0 pl-md-3 o-75'>Sign Out</Link>
        </NavItem>
      </Nav>
    );
  } else {
    return (
      <Nav navbar className='ml-md-auto'>
        <NavItem>
          <Link button color='primary' onClick={() => redirect('auth/sign-in')} className='mt-2 mt-md-0'>Sign In</Link>
        </NavItem>
      </Nav>
    );
  }
};

// Computed height of main nav.
// May need to be updated if the main nav height changes.
const MAIN_NAVBAR_HEIGHT = '64px';

const Navigation: View<Props> = props => {
  return (
    <div className='position-sticky' style={{ top: `-${MAIN_NAVBAR_HEIGHT}`, zIndex: 1000 }}>
      <Navbar expand='md' dark color='info' className='navbar border-bottom-gov'>
        <Container className='px-sm-3'>
          <NavbarBrand href={router.routeToUrl({ tag: 'landing', value: null })}>
            Digital Marketplace
          </NavbarBrand>
          <Spinner size='sm' color='info-alt' className='transition-indicator' />
          <NavbarToggler className='ml-auto' onClick={() => props.toggleIsOpen()} />
          <Collapse isOpen={props.isOpen} className='py-3 py-md-0' navbar>
            <ContextualLinks {...props} className='d-md-none' />
            <AuthLinks {...props} />
          </Collapse>
        </Container>
      </Navbar>
      <Navbar expand='sm' className='bg-info-alt d-none d-md-block shadow border-bottom-info-alt'>
        <Container className='pl-0 d-flex justify-content-between'>
          <ContextualLinks {...props} />
          <Link newTab external href={PROCUREMENT_CONCIERGE_URL} color='white' className='d-flex align-items-center flex-nowrap o-75'>
            Procurement Concierge
            <Icon name='external-link' className='ml-2' />
          </Link>
        </Container>
      </Navbar>
    </div>
  );
};

export default Navigation;*/
