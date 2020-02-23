import { DEFAULT_USER_AVATAR_IMAGE_PATH, PROCUREMENT_CONCIERGE_URL } from 'front-end/config';
import { isAllowedRouteForUsersWithUnacceptedTerms, Msg, Route, State } from 'front-end/lib/app/types';
import Footer from 'front-end/lib/app/view/footer';
import * as Nav from 'front-end/lib/app/view/nav';
import ViewPage, { Props as ViewPageProps } from 'front-end/lib/app/view/page';
import { AppMsg, ComponentView, ComponentViewProps, Dispatch, Immutable, mapAppDispatch, mapComponentDispatch, View } from 'front-end/lib/framework';
// Note(Jesse): @add_new_page_location
import * as PageContent from 'front-end/lib/pages/content';
import * as PageLanding from 'front-end/lib/pages/landing';
import * as PageNotice from 'front-end/lib/pages/notice';
import * as PageOpportunityCWUCreate from 'front-end/lib/pages/opportunity/code-with-us/create';
import * as PageOpportunityCWUEdit from 'front-end/lib/pages/opportunity/code-with-us/edit';
import * as PageOpportunityCWUView from 'front-end/lib/pages/opportunity/code-with-us/view';
import * as PageOpportunities from 'front-end/lib/pages/opportunity/list';
import * as PageOrgCreate from 'front-end/lib/pages/organization/create';
import * as PageOrgEdit from 'front-end/lib/pages/organization/edit';
import * as PageOrgList from 'front-end/lib/pages/organization/list';
import * as PageProposalCWUCreate from 'front-end/lib/pages/proposal/code-with-us/create';
import * as PageProposalCWUEdit from 'front-end/lib/pages/proposal/code-with-us/edit';
import * as PageProposalCWUExportAll from 'front-end/lib/pages/proposal/code-with-us/export/all';
import * as PageProposalCWUExportOne from 'front-end/lib/pages/proposal/code-with-us/export/one';
import * as PageProposalCWUView from 'front-end/lib/pages/proposal/code-with-us/view';
import * as PageProposalList from 'front-end/lib/pages/proposal/list';
import * as PageSignIn from 'front-end/lib/pages/sign-in';
import * as PageSignOut from 'front-end/lib/pages/sign-out';
import * as PageSignUpStepOne from 'front-end/lib/pages/sign-up/step-one';
import * as PageSignUpStepTwo from 'front-end/lib/pages/sign-up/step-two';
import * as PageUserList from 'front-end/lib/pages/user/list';
import * as PageUserProfile from 'front-end/lib/pages/user/profile';
import Icon from 'front-end/lib/views/icon';
import Link, { externalDest, iconLinkSymbol, imageLinkSymbol, leftPlacement, rightPlacement, routeDest } from 'front-end/lib/views/link';
import { compact } from 'lodash';
import { default as React } from 'react';
import { Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';
import { fileBlobPath } from 'shared/lib/resources/file';
import { hasAcceptedTermsOrIsAnonymous } from 'shared/lib/resources/session';
import { UserType } from 'shared/lib/resources/user';
import { ADT, adt, adtCurried } from 'shared/lib/types';

function makeViewPageProps<RouteParams, PageState, PageMsg>(
  props: ComponentViewProps<State, Msg>,
  component: ViewPageProps<RouteParams, PageState, PageMsg>['component'],
  getPageState: ((state: Immutable<State>) => Immutable<PageState> | undefined),
  mapPageMsg: ViewPageProps<RouteParams, PageState, PageMsg>['mapPageMsg']
): ViewPageProps<RouteParams, PageState, PageMsg> {
  return {
    dispatch: props.dispatch,
    pageState: getPageState(props.state),
    mapPageMsg,
    component: {
      ...component,
      simpleNav: !hasAcceptedTermsOrIsAnonymous(props.state.shared.session) && isAllowedRouteForUsersWithUnacceptedTerms(props.state.activeRoute)
    }
  };
}

function pageToViewPageProps(props: ComponentViewProps<State, Msg>): ViewPageProps<any, any, any> {
  switch (props.state.activeRoute.tag) {

    // Note(Jesse): @add_new_page_location
    case 'landing':
      return makeViewPageProps(
        props,
        PageLanding.component,
        state => state.pages.landing,
        value => ({ tag: 'pageLanding', value })
      );

    case 'opportunities':
      return makeViewPageProps(
        props,
        PageOpportunities.component,
        state => state.pages.opportunities,
        value => ({ tag: 'pageOpportunities', value })
      );

    case 'content':
      return makeViewPageProps(
        props,
        PageContent.component,
        state => state.pages.content,
        value => ({ tag: 'pageContent', value })
      );

    case 'orgEdit':
      return makeViewPageProps(
        props,
        PageOrgEdit.component,
        state => state.pages.orgEdit,
        value => ({ tag: 'pageOrgEdit', value })
      );

    case 'orgCreate':
      return makeViewPageProps(
        props,
        PageOrgCreate.component,
        state => state.pages.orgCreate,
        value => ({ tag: 'pageOrgCreate', value })
      );

    case 'orgList':
      return makeViewPageProps(
        props,
        PageOrgList.component,
        state => state.pages.orgList,
        value => ({ tag: 'pageOrgList', value })
      );

    case 'opportunityCWUCreate':
      return makeViewPageProps(
        props,
        PageOpportunityCWUCreate.component,
        state => state.pages.opportunityCWUCreate,
        value => ({tag: 'pageOpportunityCWUCreate', value})
      );
    case 'opportunityCWUEdit':
      return makeViewPageProps(
        props,
        PageOpportunityCWUEdit.component,
        state => state.pages.opportunityCWUEdit,
        value => ({tag: 'pageOpportunityCWUEdit', value})
      );
    case 'opportunityCWUView':
      return makeViewPageProps(
        props,
        PageOpportunityCWUView.component,
        state => state.pages.opportunityCWUView,
        value => ({tag: 'pageOpportunityCWUView', value})
      );
    case 'proposalCWUCreate':
      return makeViewPageProps(
        props,
        PageProposalCWUCreate.component,
        state => state.pages.proposalCWUCreate,
        value => ({tag: 'pageProposalCWUCreate', value})
      );
    case 'proposalCWUEdit':
      return makeViewPageProps(
        props,
        PageProposalCWUEdit.component,
        state => state.pages.proposalCWUEdit,
        value => ({tag: 'pageProposalCWUEdit', value})
      );
    case 'proposalCWUView':
      return makeViewPageProps(
        props,
        PageProposalCWUView.component,
        state => state.pages.proposalCWUView,
        value => ({tag: 'pageProposalCWUView', value})
      );
    case 'proposalCWUExportOne':
      return makeViewPageProps(
        props,
        PageProposalCWUExportOne.component,
        state => state.pages.proposalCWUExportOne,
        value => ({tag: 'pageProposalCWUExportOne', value})
      );
    case 'proposalCWUExportAll':
      return makeViewPageProps(
        props,
        PageProposalCWUExportAll.component,
        state => state.pages.proposalCWUExportAll,
        value => ({tag: 'pageProposalCWUExportAll', value})
      );
    case 'proposalList':
      return makeViewPageProps(
        props,
        PageProposalList.component,
        state => state.pages.proposalList,
        value => ({tag: 'pageProposalList', value})
      );

    case 'userList':
      return makeViewPageProps(
        props,
        PageUserList.component,
        state => state.pages.userList,
        value => ({ tag: 'pageUserList', value })
      );

    case 'userProfile':
      return makeViewPageProps(
        props,
        PageUserProfile.component,
        state => state.pages.userProfile,
        value => ({ tag: 'pageUserProfile', value })
      );

    case 'signIn':
      return makeViewPageProps(
        props,
        PageSignIn.component,
        state => state.pages.signIn,
        value => ({ tag: 'pageSignIn', value })
      );

    case 'signOut':
      return makeViewPageProps(
        props,
        PageSignOut.component,
        state => state.pages.signOut,
        value => ({ tag: 'pageSignOut', value })
      );

    case 'signUpStepOne':
      return makeViewPageProps(
        props,
        PageSignUpStepOne.component,
        state => state.pages.signUpStepOne,
        value => ({ tag: 'pageSignUpStepOne', value })
      );

    case 'signUpStepTwo':
      return makeViewPageProps(
        props,
        PageSignUpStepTwo.component,
        state => state.pages.signUpStepTwo,
        value => ({ tag: 'pageSignUpStepTwo', value })
      );

    case 'notice':
      return makeViewPageProps(
        props,
        PageNotice.component,
        state => state.pages.notice,
        value => ({ tag: 'pageNotice', value })
      );
  }
}

interface ViewModalProps {
  modal: State['modal'];
  dispatch: Dispatch<AppMsg<Msg, Route>>;
}

const ViewModal: View<ViewModalProps> = ({ dispatch, modal }) => {
  const { open, content } = modal;
  const closeModal = () => dispatch({ tag: 'closeModal', value: undefined });
  return (
    <Modal isOpen={open} toggle={closeModal}>
      <ModalHeader className='align-items-center' toggle={closeModal} close={(<Icon hover name='times' color='secondary' onClick={closeModal} />)}>{content.title}</ModalHeader>
      <ModalBody>{content.body}</ModalBody>
      <ModalFooter className='p-0' style={{ overflowX: 'auto', justifyContent: 'normal' }}>
        <div className='p-3 d-flex flex-md-row-reverse justify-content-start align-items-center text-nowrap flex-grow-1'>
          {content.actions.map(({ icon, button, text, color, msg }, i) => {
            const props = {
              key: `modal-action-${i}`,
              symbol_: icon && leftPlacement(iconLinkSymbol(icon)),
              color,
              onClick: () => dispatch(msg),
              className: i === 0 ? 'mx-0' : 'ml-3 mr-0 ml-md-0 mr-md-3'
            };
            if (button) {
              return (<Link button {...props}>{text}</Link>);
            } else {
              return (<Link {...props}>{text}</Link>);
            }
          })}
        </div>
      </ModalFooter>
    </Modal>
  );
};

const navUnauthenticatedMenu = Nav.unauthenticatedAccountMenu([
  Nav.linkAccountAction({
    children: 'Sign In',
    button: true,
    outline: true,
    color: 'white',
    dest: routeDest(adt('signIn', {}))
  }),
  Nav.linkAccountAction({
    children: 'Sign Up',
    button: true,
    color: 'primary',
    dest: routeDest(adt('signUpStepOne', null))
  })
]);

const signOutLink: Nav.NavLink = {
  children: 'Sign Out',
  dest: routeDest(adt('signOut', null)),
  symbol_: leftPlacement(iconLinkSymbol('sign-out'))
};

const procurementConciergeLink: Nav.NavLink = {
  children: 'Procurement Concierge',
  dest: externalDest(PROCUREMENT_CONCIERGE_URL),
  newTab: true,
  symbol_: rightPlacement(iconLinkSymbol('external-link'))
};

function navAccountMenus(state: Immutable<State>): Nav.Props['accountMenus'] {
  const sessionUser = state.shared.session && state.shared.session.user;
  // Return standard sign-in/up links if user is not signed in.
  if (!sessionUser) {
    return { mobile: navUnauthenticatedMenu, desktop: navUnauthenticatedMenu };
  }
  // Return separate mobile and desktop authentication menus if the user is signed in.
  const userIdentifier = sessionUser.email || sessionUser.name;
  const userAvatar = sessionUser.avatarImageFile ? fileBlobPath(sessionUser.avatarImageFile) : DEFAULT_USER_AVATAR_IMAGE_PATH;
  return {
    mobile: Nav.authenticatedMobileAccountMenu([
      [
        Nav.linkAccountAction({
          children: userIdentifier,
          dest: routeDest(adt('userProfile', { userId: sessionUser.id })),
          symbol_: leftPlacement(imageLinkSymbol(userAvatar)),
          active: !!sessionUser && state.activeRoute.tag === 'userProfile' && state.activeRoute.value.userId === sessionUser.id
        }),
        Nav.linkAccountAction(signOutLink)
      ],
      [
        Nav.linkAccountAction(procurementConciergeLink)
      ]
    ]),
    desktop: Nav.authenticatedDesktopAccountMenu({
      text: userIdentifier,
      imageUrl: userAvatar,
      linkGroups: [
        {
          label: `Signed in as ${sessionUser.name}`,
          links: compact([
            {
              children: 'My Profile',
              dest: routeDest(adt('userProfile', { userId: sessionUser.id }))
            },
            sessionUser.type === UserType.Vendor
              ? {
                  children: 'My Organizations',
                  dest: routeDest(adt('userProfile', { userId: sessionUser.id, tab: 'organizations' as const }))
                }
              : undefined
          ])
        },
        {
          links: [signOutLink]
        },
        {
          links: [procurementConciergeLink]
        }
      ]
    })
  };
}

function navAppLinks(state: Immutable<State>): Nav.Props['appLinks'] {
  const sessionUser = state.shared.session && state.shared.session.user;
  let links: Nav.NavLink[] = [];
  const opportunitiesLink: Nav.NavLink = {
    children: 'Opportunities',
    active: state.activeRoute.tag === 'opportunities',
    dest: routeDest(adt('opportunities', null))
  };
  const organizationsLink: Nav.NavLink = {
    children: 'Organizations',
    active: state.activeRoute.tag === 'orgList',
    dest: routeDest(adt('orgList', null))
  };
  if (sessionUser) {
    // User has signed in.
    links = links.concat([
      {
        children: 'Dashboard',
        // TODO add dashboard route when available.
        active: state.activeRoute.tag === 'landing',
        dest: routeDest(adt('landing', null))
      },
      opportunitiesLink,
      organizationsLink
    ]);
    if (sessionUser.type === UserType.Admin) {
      // User is an admin.
      links = links.concat([
        {
          children: 'Users',
          active: state.activeRoute.tag === 'userList',
          dest: routeDest(adt('userList', null))
        }
      ]);
    }
  } else {
    // User has not signed in.
    links = links.concat([
      {
        children: 'Home',
        active: state.activeRoute.tag === 'landing',
        dest: routeDest(adt('landing', null))
      },
      opportunitiesLink,
      organizationsLink
    ]);
  }
  return links;
}

function navContextualLinks(props: ComponentViewProps<State, Msg>): Nav.Props['contextualActions'] {
  const viewPageProps = pageToViewPageProps(props);
  if (!viewPageProps.component.getContextualActions || !viewPageProps.pageState) { return undefined; }
  return viewPageProps.component.getContextualActions({
    state: viewPageProps.pageState,
    dispatch: mapAppDispatch(props.dispatch, viewPageProps.mapPageMsg)
  }) || undefined;
}

function regularNavProps(props: ComponentViewProps<State, Msg>): Nav.Props {
  const { state, dispatch } = props;
  const dispatchNav = mapComponentDispatch(dispatch, adtCurried<ADT<'nav', Nav.Msg>>('nav'));
  return {
    state: state.nav,
    dispatch: dispatchNav,
    isLoading: state.transitionLoading > 0,
    logoImageUrl: '/images/bcgov_logo.svg',
    title: 'Digital Marketplace',
    homeDest: routeDest(adt('landing', null)),
    accountMenus: navAccountMenus(state),
    appLinks: navAppLinks(state),
    contextualActions: navContextualLinks(props)
  };
}

const completeProfileAction = Nav.linkAccountAction({
  children: 'Complete Your Profile',
  symbol_: leftPlacement(iconLinkSymbol('arrow-left')),
  button: true,
  color: 'primary',
  dest: routeDest(adt('signUpStepTwo', null))
});

function simpleNavProps(props: ComponentViewProps<State, Msg>): Nav.Props {
  const accountMenu = Nav.unauthenticatedAccountMenu([
    ...(props.state.activeRoute.tag !== 'signUpStepTwo' ? [completeProfileAction] : []),
    Nav.linkAccountAction({
      ...signOutLink,
      button: true,
      outline: true,
      color: 'white'
    })
  ]);
  return {
    ...regularNavProps(props),
    appLinks: [],
    contextualActions: undefined,
    homeDest: undefined,
    accountMenus: {
      desktop: accountMenu,
      mobile: accountMenu
    }
  };
}

const view: ComponentView<State, Msg> = props => {
  const { state, dispatch } = props;
  if (!state.ready) {
    return null;
  } else {
    const viewPageProps = pageToViewPageProps(props);
    const navProps = viewPageProps.component.simpleNav
      ? simpleNavProps(props)
      : regularNavProps(props);
    return (
      <div className={`route-${state.activeRoute.tag} ${state.transitionLoading > 0 ? 'in-transition' : ''} ${navProps.contextualActions ? 'contextual-actions-visible' : ''} app d-flex flex-column`} style={{ minHeight: '100vh' }}>
        <Nav.view {...navProps} />
        <ViewPage {...viewPageProps} />
        {viewPageProps.component.simpleNav ? null : (<Footer />)}
        <ViewModal dispatch={dispatch} modal={state.modal} />
      </div>
    );
  }
};

export default view;
