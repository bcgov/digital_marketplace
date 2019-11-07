import router, { redirect } from 'front-end/lib/app/router';
import { Route } from 'front-end/lib/app/types';
import { View } from 'front-end/lib/framework';
import Link from 'front-end/lib/views/link';
import React from 'react';
import { Collapse, Container, Nav, Navbar, NavbarBrand, NavbarToggler, NavItem, Spinner } from 'reactstrap'
import { Session } from 'shared/lib/types';

interface Props {
  isOpen: boolean;
  activeRoute: Route;
  session?: Session;
  toggleIsOpen(open?: boolean): void;
}

const activeClass = (active: boolean) => active ? 'font-weight-bold o-100' : '';
const linkClassName = (isActive: boolean) => `o-75 ${activeClass(isActive)} text-white px-0 px-md-3`;

const ContextualLinks: View<Props & { className?: string }> = ({ activeRoute, session, toggleIsOpen, className = '' }) => {
  const onClick = () => toggleIsOpen(false);
  const isBookListRoute = activeRoute.tag === 'bookList';
  const isGenreListRoute = activeRoute.tag === 'genreList';
  const isAuthorListRoute = activeRoute.tag === 'authorList';
  const bookListRoute: Route = { tag: 'bookList', value: null };
  const genreListRoute: Route = { tag: 'genreList', value: null };
  const authorListRoute: Route = { tag: 'authorList', value: null };
  if (!session || !session.user) {
    return (
      <Nav navbar className={className}>
        <NavItem>
          <Link nav route={bookListRoute} className={linkClassName(isBookListRoute)} onClick={onClick}>Books</Link>
        </NavItem>
      </Nav>
    );
  }
  switch (session.user.tag) {
    case 'user':
      return (
        <Nav navbar className={className}>
          <NavItem>
            <Link nav route={bookListRoute} className={linkClassName(isBookListRoute)} onClick={onClick}>Books</Link>
          </NavItem>
          <NavItem>
            <Link nav route={genreListRoute} className={linkClassName(isGenreListRoute)} onClick={onClick}>Genres</Link>
          </NavItem>
        </Nav>
      );
    case 'librarian':
      return (
        <Nav navbar className={className}>
          <NavItem>
            <Link nav route={bookListRoute} className={linkClassName(isBookListRoute)} onClick={onClick}>Books</Link>
          </NavItem>
          <NavItem>
            <Link nav route={authorListRoute} className={linkClassName(isAuthorListRoute)} onClick={onClick}>Authors</Link>
          </NavItem>
        </Nav>
      );
  }
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
          <Link nav color='white' className='px-0 px-md-3' style={{ opacity: 0.35 }} disabled>{session.user.value.email}</Link>
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
          <Link button color='primary' onClick={() => redirect('auth/sign-in')} className='mt-2 mt-md-0'>Sign In With Google</Link>
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
          <NavbarBrand href={router.routeToUrl({ tag: 'bookList', value: null })}>
            Digital Marketplace Code Challenge
          </NavbarBrand>
          <Spinner size='sm' color='info-alt' className='transition-indicator d-md-none' />
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
          <Spinner size='sm' color='info' className='transition-indicator' />
        </Container>
      </Navbar>
    </div>
  );
};

export default Navigation;
