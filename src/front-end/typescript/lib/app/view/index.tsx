import { DEFAULT_USER_AVATAR_IMAGE_PATH } from "front-end/config";
import { fileBlobPath, prefixPath } from "front-end/lib";
import getAppModal from "front-end/lib/app/modal";
import {
  isAllowedRouteForUsersWithUnacceptedTerms,
  Msg,
  State,
  Route,
  InnerMsg
} from "front-end/lib/app/types";
import Footer from "front-end/lib/app/view/footer";
import * as Nav from "front-end/lib/app/view/nav";
import ViewPage, { Props as ViewPageProps } from "front-end/lib/app/view/page";
import { Immutable, component as component_ } from "front-end/lib/framework";
import * as PageContentCreate from "front-end/lib/pages/content/create";
import * as PageContentEdit from "front-end/lib/pages/content/edit";
import * as PageContentList from "front-end/lib/pages/content/list";
import * as PageContentView from "front-end/lib/pages/content/view";
import * as PageDashboard from "front-end/lib/pages/dashboard";
import * as PageLanding from "front-end/lib/pages/landing";
import * as PageLearnMoreCWU from "front-end/lib/pages/learn-more/code-with-us";
import * as PageLearnMoreTWU from "front-end/lib/pages/learn-more/team-with-us";
import * as PageLearnMoreSWU from "front-end/lib/pages/learn-more/sprint-with-us";
import * as PageNotFound from "front-end/lib/pages/not-found";
import * as PageNotice from "front-end/lib/pages/notice";
import * as PageOpportunityCWUCreate from "front-end/lib/pages/opportunity/code-with-us/create";
import * as PageOpportunityCWUEdit from "front-end/lib/pages/opportunity/code-with-us/edit";
import * as PageOpportunityCWUView from "front-end/lib/pages/opportunity/code-with-us/view";
import * as PageOpportunityCreate from "front-end/lib/pages/opportunity/create";
import * as PageOpportunities from "front-end/lib/pages/opportunity/list";
import * as PageOpportunitySWUCreate from "front-end/lib/pages/opportunity/sprint-with-us/create";
import * as PageOpportunitySWUEdit from "front-end/lib/pages/opportunity/sprint-with-us/edit";
import * as PageOpportunitySWUView from "front-end/lib/pages/opportunity/sprint-with-us/view";
import * as PageOpportunitySWUComplete from "front-end/lib/pages/opportunity/sprint-with-us/complete";
import * as PageOpportunityCWUComplete from "front-end/lib/pages/opportunity/code-with-us/complete";
import * as PageOpportunityTWUComplete from "front-end/lib/pages/opportunity/team-with-us/complete";
import * as PageOpportunityTWUCreate from "front-end/lib/pages/opportunity/team-with-us/create";
import * as PageOpportunityTWUEdit from "front-end/lib/pages/opportunity/team-with-us/edit";
import * as PageOpportunityTWUView from "front-end/lib/pages/opportunity/team-with-us/view";
import * as PageOrgCreate from "front-end/lib/pages/organization/create";
import * as PageOrgEdit from "front-end/lib/pages/organization/edit";
import * as PageOrgList from "front-end/lib/pages/organization/list";
import * as PageOrgSWUTerms from "front-end/lib/pages/organization/sprint-with-us-terms";
import * as PageOrgTWUTerms from "front-end/lib/pages/organization/team-with-us-terms";
import * as PageProposalCWUCreate from "front-end/lib/pages/proposal/code-with-us/create";
import * as PageProposalCWUEdit from "front-end/lib/pages/proposal/code-with-us/edit";
import * as PageProposalCWUExportAll from "front-end/lib/pages/proposal/code-with-us/export/all";
import * as PageProposalCWUExportOne from "front-end/lib/pages/proposal/code-with-us/export/one";
import * as PageProposalCWUView from "front-end/lib/pages/proposal/code-with-us/view";
import * as PageProposalList from "front-end/lib/pages/proposal/list";
import * as PageProposalSWUCreate from "front-end/lib/pages/proposal/sprint-with-us/create";
import * as PageProposalSWUEdit from "front-end/lib/pages/proposal/sprint-with-us/edit";
import * as PageProposalSWUExportAll from "front-end/lib/pages/proposal/sprint-with-us/export/all";
import * as PageProposalSWUExportOne from "front-end/lib/pages/proposal/sprint-with-us/export/one";
import * as PageProposalSWUView from "front-end/lib/pages/proposal/sprint-with-us/view";
import * as PageProposalTWUCreate from "front-end/lib/pages/proposal/team-with-us/create";
import * as PageProposalTWUEdit from "front-end/lib/pages/proposal/team-with-us/edit";
import * as PageProposalTWUView from "front-end/lib/pages/proposal/team-with-us/view";
import * as PageProposalTWUExportAll from "front-end/lib/pages/proposal/team-with-us/export/all";
import * as PageProposalTWUExportOne from "front-end/lib/pages/proposal/team-with-us/export/one";
import * as PageSignIn from "front-end/lib/pages/sign-in";
import * as PageSignOut from "front-end/lib/pages/sign-out";
import * as PageSignUpStepOne from "front-end/lib/pages/sign-up/step-one";
import * as PageSignUpStepTwo from "front-end/lib/pages/sign-up/step-two";
import * as PageUserList from "front-end/lib/pages/user/list";
import * as PageUserProfile from "front-end/lib/pages/user/profile";
import { ThemeColor } from "front-end/lib/types";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import Link, {
  iconLinkSymbol,
  imageLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import { compact } from "lodash";
import { default as React } from "react";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Toast,
  ToastBody
} from "reactstrap";
import { VITE_SHOW_TEST_INDICATOR } from "shared/config";
import { hasAcceptedTermsOrIsAnonymous } from "shared/lib/resources/session";
import { UserType } from "shared/lib/resources/user";
import { ADT, adt, adtCurried } from "shared/lib/types";

function makeViewPageProps<RouteParams, PageState, PageMsg>(
  props: component_.base.ComponentViewProps<State, Msg>,
  component: ViewPageProps<RouteParams, PageState, PageMsg>["component"],
  getPageState: (state: Immutable<State>) => Immutable<PageState> | undefined,
  mapPageMsg: ViewPageProps<RouteParams, PageState, PageMsg>["mapPageMsg"]
): ViewPageProps<RouteParams, PageState, PageMsg> {
  return {
    state: props.state,
    dispatch: props.dispatch,
    pageState: getPageState(props.state),
    mapPageMsg,
    component: {
      ...component,
      simpleNav:
        !hasAcceptedTermsOrIsAnonymous(props.state.shared.session) &&
        isAllowedRouteForUsersWithUnacceptedTerms(props.state.activeRoute)
    }
  };
}

function pageToViewPageProps(
  props: component_.base.ComponentViewProps<State, Msg>
): ViewPageProps<any, any, any> {
  switch (props.state.activeRoute.tag) {
    case "landing":
      return makeViewPageProps(
        props,
        PageLanding.component,
        (state) => state.pages.landing,
        (value) => ({ tag: "pageLanding", value })
      );

    case "dashboard":
      return makeViewPageProps(
        props,
        PageDashboard.component,
        (state) => state.pages.dashboard,
        (value) => ({ tag: "pageDashboard", value })
      );

    case "opportunities":
      return makeViewPageProps(
        props,
        PageOpportunities.component,
        (state) => state.pages.opportunities,
        (value) => ({ tag: "pageOpportunities", value })
      );

    case "opportunityCreate":
      return makeViewPageProps(
        props,
        PageOpportunityCreate.component,
        (state) => state.pages.opportunityCreate,
        (value) => ({ tag: "pageOpportunityCreate", value })
      );

    case "learnMoreCWU":
      return makeViewPageProps(
        props,
        PageLearnMoreCWU.component,
        (state) => state.pages.learnMoreCWU,
        (value) => ({ tag: "pageLearnMoreCWU", value })
      );

    case "learnMoreTWU":
      return makeViewPageProps(
        props,
        PageLearnMoreTWU.component,
        (state) => state.pages.learnMoreTWU,
        (value) => ({ tag: "pageLearnMoreTWU", value })
      );

    case "learnMoreSWU":
      return makeViewPageProps(
        props,
        PageLearnMoreSWU.component,
        (state) => state.pages.learnMoreSWU,
        (value) => ({ tag: "pageLearnMoreSWU", value })
      );

    case "cwuGuide":
    case "swuGuide":
    case "twuGuide":
    case "contentView":
      return makeViewPageProps(
        props,
        PageContentView.component,
        (state) => state.pages.contentView,
        (value) => ({ tag: "pageContentView", value })
      );

    case "contentEdit":
      return makeViewPageProps(
        props,
        PageContentEdit.component,
        (state) => state.pages.contentEdit,
        (value) => ({ tag: "pageContentEdit", value })
      );

    case "contentList":
      return makeViewPageProps(
        props,
        PageContentList.component,
        (state) => state.pages.contentList,
        (value) => ({ tag: "pageContentList", value })
      );

    case "contentCreate":
      return makeViewPageProps(
        props,
        PageContentCreate.component,
        (state) => state.pages.contentCreate,
        (value) => ({ tag: "pageContentCreate", value })
      );

    case "orgEdit":
      return makeViewPageProps(
        props,
        PageOrgEdit.component,
        (state) => state.pages.orgEdit,
        (value) => ({ tag: "pageOrgEdit", value })
      );

    case "orgSWUTerms":
      return makeViewPageProps(
        props,
        PageOrgSWUTerms.component,
        (state) => state.pages.orgSWUTerms,
        (value) => ({ tag: "pageOrgSWUTerms", value })
      );

    case "orgTWUTerms":
      return makeViewPageProps(
        props,
        PageOrgTWUTerms.component,
        (state) => state.pages.orgTWUTerms,
        (value) => ({ tag: "pageOrgTWUTerms", value })
      );

    case "orgCreate":
      return makeViewPageProps(
        props,
        PageOrgCreate.component,
        (state) => state.pages.orgCreate,
        (value) => ({ tag: "pageOrgCreate", value })
      );

    case "orgList":
      return makeViewPageProps(
        props,
        PageOrgList.component,
        (state) => state.pages.orgList,
        (value) => ({ tag: "pageOrgList", value })
      );

    case "proposalSWUCreate":
      return makeViewPageProps(
        props,
        PageProposalSWUCreate.component,
        (state) => state.pages.proposalSWUCreate,
        (value) => ({ tag: "pageProposalSWUCreate", value })
      );

    case "proposalSWUEdit":
      return makeViewPageProps(
        props,
        PageProposalSWUEdit.component,
        (state) => state.pages.proposalSWUEdit,
        (value) => ({ tag: "pageProposalSWUEdit", value })
      );

    case "questionEvaluationIndividualSWUCreate":
    case "questionEvaluationIndividualSWUEdit":
    case "questionEvaluationConsensusSWUCreate":
    case "questionEvaluationConsensusSWUEdit":
    case "proposalSWUView":
      return makeViewPageProps(
        props,
        PageProposalSWUView.component,
        (state) => state.pages.proposalSWUView,
        (value) => ({ tag: "pageProposalSWUView", value })
      );

    case "opportunitySWUCreate":
      return makeViewPageProps(
        props,
        PageOpportunitySWUCreate.component,
        (state) => state.pages.opportunitySWUCreate,
        (value) => ({ tag: "pageOpportunitySWUCreate", value })
      );

    case "opportunitySWUEdit":
      return makeViewPageProps(
        props,
        PageOpportunitySWUEdit.component,
        (state) => state.pages.opportunitySWUEdit,
        (value) => ({ tag: "pageOpportunitySWUEdit", value })
      );

    case "opportunitySWUView":
      return makeViewPageProps(
        props,
        PageOpportunitySWUView.component,
        (state) => state.pages.opportunitySWUView,
        (value) => ({ tag: "pageOpportunitySWUView", value })
      );

    case "swuOpportunityCompleteView":
      return makeViewPageProps(
        props,
        PageOpportunitySWUComplete.component,
        (state) => state.pages.swuOpportunityCompleteView,
        (value) => ({ tag: "pageOpportunitySWUComplete", value })
      );

    case "cwuOpportunityCompleteView":
      return makeViewPageProps(
        props,
        PageOpportunityCWUComplete.component,
        (state) => state.pages.cwuOpportunityCompleteView,
        (value) => ({ tag: "pageOpportunityCWUComplete", value })
      );

    case "twuOpportunityCompleteView":
      return makeViewPageProps(
        props,
        PageOpportunityTWUComplete.component,
        (state) => state.pages.twuOpportunityCompleteView,
        (value) => ({ tag: "pageOpportunityTWUComplete", value })
      );

    case "opportunityTWUCreate":
      return makeViewPageProps(
        props,
        PageOpportunityTWUCreate.component,
        (state) => state.pages.opportunityTWUCreate,
        (value) => ({ tag: "pageOpportunityTWUCreate", value })
      );

    case "opportunityTWUEdit":
      return makeViewPageProps(
        props,
        PageOpportunityTWUEdit.component,
        (state) => state.pages.opportunityTWUEdit,
        (value) => ({ tag: "pageOpportunityTWUEdit", value })
      );
    case "opportunityTWUView":
      return makeViewPageProps(
        props,
        PageOpportunityTWUView.component,
        (state) => state.pages.opportunityTWUView,
        (value) => ({ tag: "pageOpportunityTWUView", value })
      );
    case "opportunityCWUCreate":
      return makeViewPageProps(
        props,
        PageOpportunityCWUCreate.component,
        (state) => state.pages.opportunityCWUCreate,
        (value) => ({ tag: "pageOpportunityCWUCreate", value })
      );

    case "opportunityCWUEdit":
      return makeViewPageProps(
        props,
        PageOpportunityCWUEdit.component,
        (state) => state.pages.opportunityCWUEdit,
        (value) => ({ tag: "pageOpportunityCWUEdit", value })
      );

    case "opportunityCWUView":
      return makeViewPageProps(
        props,
        PageOpportunityCWUView.component,
        (state) => state.pages.opportunityCWUView,
        (value) => ({ tag: "pageOpportunityCWUView", value })
      );

    case "proposalCWUCreate":
      return makeViewPageProps(
        props,
        PageProposalCWUCreate.component,
        (state) => state.pages.proposalCWUCreate,
        (value) => ({ tag: "pageProposalCWUCreate", value })
      );

    case "proposalCWUEdit":
      return makeViewPageProps(
        props,
        PageProposalCWUEdit.component,
        (state) => state.pages.proposalCWUEdit,
        (value) => ({ tag: "pageProposalCWUEdit", value })
      );

    case "proposalCWUView":
      return makeViewPageProps(
        props,
        PageProposalCWUView.component,
        (state) => state.pages.proposalCWUView,
        (value) => ({ tag: "pageProposalCWUView", value })
      );

    case "proposalCWUExportOne":
      return makeViewPageProps(
        props,
        PageProposalCWUExportOne.component,
        (state) => state.pages.proposalCWUExportOne,
        (value) => ({ tag: "pageProposalCWUExportOne", value })
      );

    case "proposalCWUExportAll":
      return makeViewPageProps(
        props,
        PageProposalCWUExportAll.component,
        (state) => state.pages.proposalCWUExportAll,
        (value) => ({ tag: "pageProposalCWUExportAll", value })
      );

    case "proposalSWUExportOne":
      return makeViewPageProps(
        props,
        PageProposalSWUExportOne.component,
        (state) => state.pages.proposalSWUExportOne,
        (value) => ({ tag: "pageProposalSWUExportOne", value })
      );

    case "proposalSWUExportAll":
      return makeViewPageProps(
        props,
        PageProposalSWUExportAll.component,
        (state) => state.pages.proposalSWUExportAll,
        (value) => ({ tag: "pageProposalSWUExportAll", value })
      );

    case "proposalTWUCreate":
      return makeViewPageProps(
        props,
        PageProposalTWUCreate.component,
        (state) => state.pages.proposalTWUCreate,
        (value) => ({ tag: "pageProposalTWUCreate", value })
      );

    case "proposalTWUEdit":
      return makeViewPageProps(
        props,
        PageProposalTWUEdit.component,
        (state) => state.pages.proposalTWUEdit,
        (value) => ({ tag: "pageProposalTWUEdit", value })
      );

    case "questionEvaluationIndividualTWUCreate":
    case "questionEvaluationIndividualTWUEdit":
    case "questionEvaluationConsensusTWUCreate":
    case "questionEvaluationConsensusTWUEdit":
    case "proposalTWUView":
      return makeViewPageProps(
        props,
        PageProposalTWUView.component,
        (state) => state.pages.proposalTWUView,
        (value) => ({ tag: "pageProposalTWUView", value })
      );

    case "proposalTWUExportOne":
      return makeViewPageProps(
        props,
        PageProposalTWUExportOne.component,
        (state) => state.pages.proposalTWUExportOne,
        (value) => ({ tag: "pageProposalTWUExportOne", value })
      );

    case "proposalTWUExportAll":
      return makeViewPageProps(
        props,
        PageProposalTWUExportAll.component,
        (state) => state.pages.proposalTWUExportAll,
        (value) => ({ tag: "pageProposalTWUExportAll", value })
      );

    case "proposalList":
      return makeViewPageProps(
        props,
        PageProposalList.component,
        (state) => state.pages.proposalList,
        (value) => ({ tag: "pageProposalList", value })
      );

    case "userList":
      return makeViewPageProps(
        props,
        PageUserList.component,
        (state) => state.pages.userList,
        (value) => ({ tag: "pageUserList", value })
      );

    case "userProfile":
      return makeViewPageProps(
        props,
        PageUserProfile.component,
        (state) => state.pages.userProfile,
        (value) => ({ tag: "pageUserProfile", value })
      );

    case "signIn":
      return makeViewPageProps(
        props,
        PageSignIn.component,
        (state) => state.pages.signIn,
        (value) => ({ tag: "pageSignIn", value })
      );

    case "signOut":
      return makeViewPageProps(
        props,
        PageSignOut.component,
        (state) => state.pages.signOut,
        (value) => ({ tag: "pageSignOut", value })
      );

    case "signUpStepOne":
      return makeViewPageProps(
        props,
        PageSignUpStepOne.component,
        (state) => state.pages.signUpStepOne,
        (value) => ({ tag: "pageSignUpStepOne", value })
      );

    case "signUpStepTwo":
      return makeViewPageProps(
        props,
        PageSignUpStepTwo.component,
        (state) => state.pages.signUpStepTwo,
        (value) => ({ tag: "pageSignUpStepTwo", value })
      );

    case "notice":
      return makeViewPageProps(
        props,
        PageNotice.component,
        (state) => state.pages.notice,
        (value) => ({ tag: "pageNotice", value })
      );

    case "notFound":
      return makeViewPageProps(
        props,
        PageNotFound.component,
        (state) => state.pages.notFound,
        (value) => ({ tag: "pageNotFound", value })
      );
  }
}

interface ViewModalProps {
  dispatch: component_.base.Dispatch<Msg>;
  pageModal: component_.page.Modal<Msg>;
  appModal: component_.page.Modal<Msg>;
}

const ViewModal: component_.base.View<ViewModalProps> = ({
  dispatch,
  pageModal,
  appModal
}) => {
  const modalToShow = appModal?.value || pageModal?.value;
  // Return empty modal if none to display to support transitions
  if (!modalToShow) {
    return (
      <Modal isOpen={false}>
        <ModalHeader
          className="align-items-center"
          close={<Icon hover name="times" color="secondary" />}>
          &nbsp;
        </ModalHeader>
        <ModalBody>&nbsp;</ModalBody>
      </Modal>
    );
  }
  const closeModal = () => {
    dispatch(modalToShow.onCloseMsg);
  };
  return (
    <Modal isOpen={true} toggle={closeModal}>
      <ModalHeader
        className="align-items-center"
        toggle={closeModal}
        close={
          <Icon
            hover
            name="times"
            color="secondary"
            onClick={closeModal}
            className="ms-auto"
          />
        }>
        {modalToShow.title}
      </ModalHeader>
      <ModalBody>{modalToShow.body(dispatch)}</ModalBody>
      {modalToShow.actions.length ? (
        <ModalFooter
          className="p-0"
          style={{ overflowX: "auto", justifyContent: "normal" }}>
          <div className="p-3 d-flex flex-row-reverse justify-content-start align-items-center text-nowrap flex-grow-1">
            {modalToShow.actions.map(
              ({ loading, disabled, icon, button, text, color, msg }, i) => {
                const props = {
                  symbol_: icon && leftPlacement(iconLinkSymbol(icon)),
                  color,
                  loading,
                  disabled,
                  onClick: () => dispatch(msg),
                  className: i === 0 ? "mx-0" : "me-3"
                };
                if (button) {
                  // Use a key that includes text in addition to index
                  // (SonarQube - "Avoid using index as key")
                  return (
                    <Link key={`modal-action-${i}-${text}`} button {...props}>
                      {text}
                    </Link>
                  );
                } else {
                  return (
                    <Link key={`modal-action-${i}-${text}`} {...props}>
                      {text}
                    </Link>
                  );
                }
              }
            )}
          </div>
        </ModalFooter>
      ) : null}
    </Modal>
  );
};

const ViewToastIcon: component_.base.View<{
  toast: component_.global.Toast;
}> = ({ toast }) => {
  const name: AvailableIcons = (() => {
    switch (toast.tag) {
      case "info":
        return "info-circle";
      case "error":
        return "times-circle";
      case "warning":
        return "exclamation-circle";
      case "success":
        return "check-circle";
    }
  })();
  const color: ThemeColor = (() => {
    switch (toast.tag) {
      case "info":
        return "c-toast-info-icon";
      case "error":
        return "c-toast-error-icon";
      case "warning":
        return "c-toast-warning-icon";
      case "success":
        return "c-toast-success-icon";
    }
  })();
  return <Icon name={name} color={color} />;
};

const ViewToasts: component_.base.ComponentView<State, Msg> = ({
  state,
  dispatch
}) => {
  const toasts = state.toasts;
  if (!toasts.length) {
    return null;
  }
  return (
    <div className="toast-wrapper">
      {toasts.map((toast, i) => (
        <Toast
          fade
          key={`page-toast-${i}`}
          className={i < toasts.length - 1 ? "mb-3" : ""}>
          <div className="d-flex align-items-center justify-content-start toast-header">
            <ViewToastIcon toast={toast} />
            <strong className="mx-2">{toast.value.title}</strong>
            <Icon
              hover
              className="ms-auto"
              name="times"
              color="secondary"
              onClick={() => dispatch(adt("dismissToast", i))}
            />
          </div>
          <ToastBody>{toast.value.body}</ToastBody>
        </Toast>
      ))}
    </div>
  );
};

const navUnauthenticatedMenu = Nav.unauthenticatedAccountMenu([
  Nav.linkAccountAction({
    children: "Sign In",
    button: true,
    outline: true,
    dest: routeDest(adt("signIn", {}))
  }),
  Nav.linkAccountAction({
    children: "Sign Up",
    button: true,
    color: "primary",
    dest: routeDest(adt("signUpStepOne", {}))
  })
]);

const signOutLink: Nav.NavLink = {
  children: "Sign Out",
  dest: routeDest(adt("signOut", null)),
  symbol_: leftPlacement(iconLinkSymbol("sign-out"))
};

function navAccountMenus(state: Immutable<State>): Nav.Props["accountMenus"] {
  const sessionUser = state.shared.session && state.shared.session.user;
  // Return standard sign-in/up links if user is not signed in.
  if (!sessionUser) {
    return { mobile: navUnauthenticatedMenu, desktop: navUnauthenticatedMenu };
  }
  // Return separate mobile and desktop authentication menus if the user is signed in.
  const userIdentifier = sessionUser.email || sessionUser.name;
  const userAvatar = sessionUser.avatarImageFile
    ? fileBlobPath(sessionUser.avatarImageFile)
    : DEFAULT_USER_AVATAR_IMAGE_PATH;
  return {
    mobile: Nav.authenticatedMobileAccountMenu([
      [
        Nav.linkAccountAction({
          children: userIdentifier,
          dest: routeDest(adt("userProfile", { userId: sessionUser.id })),
          symbol_: leftPlacement(imageLinkSymbol(userAvatar)),
          active:
            !!sessionUser &&
            state.activeRoute.tag === "userProfile" &&
            state.activeRoute.value.userId === sessionUser.id
        }),
        Nav.linkAccountAction(signOutLink)
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
              children: "My Profile",
              dest: routeDest(adt("userProfile", { userId: sessionUser.id }))
            },
            sessionUser.type === UserType.Vendor
              ? {
                  children: "My Organizations",
                  dest: routeDest(
                    adt("userProfile", {
                      userId: sessionUser.id,
                      tab: "organizations" as const
                    })
                  )
                }
              : undefined
          ])
        },
        {
          links: [signOutLink]
        }
      ]
    })
  };
}

function navAppLinks(state: Immutable<State>): Nav.Props["appLinks"] {
  const sessionUser = state.shared.session && state.shared.session.user;
  let links: Nav.NavLink[] = [];
  const opportunitiesLink: Nav.NavLink = {
    children: "Opportunities",
    active: state.activeRoute.tag === "opportunities",
    dest: routeDest(adt("opportunities", null))
  };
  const organizationsLink: Nav.NavLink = {
    children: "Organizations",
    active: state.activeRoute.tag === "orgList",
    dest: routeDest(adt("orgList", {}))
  };
  if (sessionUser) {
    // User has signed in.
    links = links.concat([
      {
        children: "Dashboard",
        active: state.activeRoute.tag === "dashboard",
        dest: routeDest(adt("dashboard", null))
      },
      opportunitiesLink,
      organizationsLink
    ]);
    if (sessionUser.type === UserType.Admin) {
      // User is an admin.
      links = links.concat([
        {
          children: "Users",
          active: state.activeRoute.tag === "userList",
          dest: routeDest(adt("userList", null))
        },
        {
          children: "Content",
          active: state.activeRoute.tag === "contentList",
          dest: routeDest(adt("contentList", null))
        }
      ]);
    }
  } else {
    // User has not signed in.
    links = links.concat([
      {
        children: "Home",
        active: state.activeRoute.tag === "landing",
        dest: routeDest(adt("landing", null))
      },
      opportunitiesLink,
      organizationsLink
    ]);
  }
  return links;
}

function navContextualLinks(
  props: component_.base.ComponentViewProps<State, Msg>
): Nav.Props["contextualActions"] {
  const viewPageProps = pageToViewPageProps(props);
  if (!viewPageProps.component.getActions || !viewPageProps.pageState) {
    return undefined;
  }
  return (
    viewPageProps.component.getActions({
      state: viewPageProps.pageState,
      dispatch: component_.app.mapDispatch<InnerMsg, any, Route>(
        props.dispatch,
        viewPageProps.mapPageMsg
      )
    }) || undefined
  );
}

function regularNavProps(
  props: component_.base.ComponentViewProps<State, Msg>
): Nav.Props {
  const { state, dispatch } = props;
  const dispatchNav = component_.base.mapDispatch(
    dispatch,
    adtCurried<ADT<"nav", Nav.Msg>>("nav")
  );
  return {
    state: state.nav,
    dispatch: dispatchNav,
    isLoading: !!state.incomingRoute,
    logoImageUrl: prefixPath(
      VITE_SHOW_TEST_INDICATOR ? "/images/logo_test.svg" : "/images/logo.svg"
    ),
    title: "Digital Marketplace",
    homeDest: routeDest(adt("landing", null)),
    accountMenus: navAccountMenus(state),
    appLinks: navAppLinks(state),
    contextualActions: navContextualLinks(props)
  };
}

const completeProfileAction = Nav.linkAccountAction({
  children: "Complete Your Profile",
  symbol_: leftPlacement(iconLinkSymbol("arrow-left")),
  button: true,
  color: "primary",
  dest: routeDest(adt("signUpStepTwo", null))
});

function simpleNavProps(
  props: component_.base.ComponentViewProps<State, Msg>
): Nav.Props {
  const accountMenu = (color: ThemeColor) =>
    Nav.unauthenticatedAccountMenu([
      ...(props.state.activeRoute.tag !== "signUpStepTwo"
        ? [completeProfileAction]
        : []),
      Nav.linkAccountAction({
        ...signOutLink,
        button: true,
        outline: true,
        color
      })
    ]);
  return {
    ...regularNavProps(props),
    appLinks: [],
    contextualActions: undefined,
    homeDest: undefined,
    accountMenus: {
      desktop: accountMenu("c-nav-fg"),
      mobile: accountMenu("c-nav-fg-alt")
    }
  };
}

const view: component_.base.ComponentView<State, Msg> = (props) => {
  const { state, dispatch } = props;
  if (!state.ready) {
    return null;
  } else {
    const viewPageProps = pageToViewPageProps(props);
    const navProps = viewPageProps.component.simpleNav
      ? simpleNavProps(props)
      : regularNavProps(props);
    const pageModal: component_.page.Modal<Msg> =
      viewPageProps.component.getModal && viewPageProps.pageState
        ? (component_.page.modal.mapPage(
            viewPageProps.component.getModal(viewPageProps.pageState),
            viewPageProps.mapPageMsg
          ) as component_.page.Modal<Msg>)
        : (component_.page.modal.hide() as component_.page.Modal<Msg>);
    const appModal = getAppModal(state);
    return (
      <div
        className={`route-${state.activeRoute.tag} ${
          state.incomingRoute ? "in-transition" : ""
        } ${
          navProps.contextualActions ? "contextual-actions-visible" : ""
        } app d-flex flex-column`}
        style={{ minHeight: "100vh" }}>
        <Nav.view {...navProps} />
        <ViewPage {...viewPageProps} />
        {viewPageProps.component.simpleNav ? null : <Footer />}
        <ViewToasts {...props} />
        <ViewModal
          dispatch={dispatch}
          pageModal={pageModal}
          appModal={appModal}
        />
      </div>
    );
  }
};

export default view;
