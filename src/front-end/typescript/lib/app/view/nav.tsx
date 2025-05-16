import { DROPDOWN_CARET_SIZE } from "front-end/config";
import { component as component_ } from "front-end/lib/framework";
import { ThemeColor } from "front-end/lib/types";
import Icon from "front-end/lib/views/icon";
import Link, {
  Dest,
  ExtendProps as ExtendLinkProps,
  iconLinkSymbol,
  rightPlacement,
  Props as LinkComponentPropsType
} from "front-end/lib/views/link";
import Separator from "front-end/lib/views/separator";
import React, { Fragment, MouseEvent } from "react";
import {
  ButtonDropdown,
  Col,
  Container,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Row,
  Spinner
} from "reactstrap";
import { ADT, adt, adtCurried } from "shared/lib/types";
export type Params = null;

export interface State {
  isDesktopAccountDropdownOpen: boolean;
  // Need to toggle each contextual dropdown for mobile/desktop
  // separately because we use media queries (CSS) to hide/show them,
  // which means their event listeners are always on.
  // So, when trying to use the mobile dropdown, the desktop dropdown's
  // handleDocumentClick function clobbers any onClick handlers that
  // we have specified.
  // So, when trying to use the mobile dropdown, the desktop dropdown's
  // handleDocumentClick function clobbers any onClick handlers that
  // we have specified.
  isDesktopContextualDropdownOpen: boolean;
  isMobileContextualDropdownOpen: boolean;
  isMobileMenuOpen: boolean;
}

export type Msg =
  | ADT<"toggleMobileMenu", boolean | undefined>
  | ADT<"toggleDesktopAccountDropdown", boolean | undefined>
  | ADT<"toggleDesktopContextualDropdown", boolean | undefined>
  | ADT<"toggleMobileContextualDropdown", boolean | undefined>;

export const init: component_.base.Init<Params, State, Msg> = () => {
  return [
    {
      isDesktopAccountDropdownOpen: false,
      isDesktopContextualDropdownOpen: false,
      isMobileContextualDropdownOpen: false,
      isMobileMenuOpen: false
    },
    []
  ];
};

export const update: component_.base.Update<State, Msg> = ({ state, msg }) => {
  switch (msg.tag) {
    case "toggleMobileMenu":
      return [
        state.update("isMobileMenuOpen", (v) =>
          msg.value === undefined ? !v : msg.value
        ),
        []
      ];
    case "toggleDesktopAccountDropdown":
      return [
        state.update("isDesktopAccountDropdownOpen", (v) =>
          msg.value === undefined ? !v : msg.value
        ),
        []
      ];
    case "toggleDesktopContextualDropdown":
      return [
        state.update("isDesktopContextualDropdownOpen", (v) =>
          msg.value === undefined ? !v : msg.value
        ),
        []
      ];
    case "toggleMobileContextualDropdown":
      return [
        state.update("isMobileContextualDropdownOpen", (v) =>
          msg.value === undefined ? !v : msg.value
        ),
        []
      ];
  }
};

export type NavLink = ExtendLinkProps<{ active?: boolean }>;

type NavLinkProps = NavLink & { dispatch: component_.base.Dispatch<Msg> };

const NavLink: component_.base.View<NavLinkProps> = (props) => {
  const {
    dispatch,
    onClick: propOnClickPassedToNavLink,
    children,
    className,
    active,
    color: navLinkColorInput,
    dest,
    button,
    ...restOfLinkComponentProps
  } = props;

  // Explanation of the NavLink click handling strategy:
  //
  // === The Problem ===
  // NavLink clicks were not triggering client-side navigation. Clicking a NavLink did nothing visible.
  //
  // === Root Cause & React Event System Context ===
  // The issue stemmed from the interaction between React's synthetic event system, a component-internal
  // call to event.preventDefault(), and the application's global native click handler for routing.
  //
  // 1. React's Event Delegation: React attaches its event listeners (e.g., for 'click') to the root of the
  //    React application (e.g., div#main) rather than to individual DOM elements. When a native DOM event
  //    occurs (like a click on an <a> tag), it bubbles up to this root listener.
  //
  // 2. Synthetic Events: React then wraps the native event in a SyntheticEvent object and dispatches this
  //    synthetic event through the React component tree to relevant component onClick props.
  //
  // 3. preventDefault() Behavior: If an onClick handler in a React component calls e.preventDefault()
  //    on the SyntheticEvent, React ensures that preventDefault() is also called on the original
  //    native browser event.
  //
  // 4. The Specifics in this App:
  //    a. NavLink renders an underlying generic <Link> component.
  //    b. This <Link> component (specifically its internal AnchorLink implementation) would call
  //       event.preventDefault() on the synthetic event if it received an onClick prop from NavLink.
  //       This is a common pattern for components intending to manage their own routing or click effects.
  //    c. This action marked the native browser event as defaultPrevented.
  //    d. The application's global click handler (in click-handler.ts), listening on document.body for
  //       *native* click events to manage client-side routing, checks the native event's defaultPrevented status.
  //    e. Finding it true, the global handler would ignore the event, assuming the component that called
  //       preventDefault() (i.e., AnchorLink, triggered by NavLink's passed onClick) would handle navigation.
  //    f. However, NavLink's original onClick handler only managed UI side effects (like closing menus)
  //       and did not itself initiate client-side navigation after AnchorLink had already stopped the default action.
  //
  // === How Package Updates Might Have Surfaced This ===
  // While React's core event system behavior is stable, package updates (e.g., to React itself, react-dom,
  // a component library like Bootstrap/React-Bootstrap if used, or updates/refactors to the custom
  // <Link>/AnchorLink components) could have altered when or how e.preventDefault() was called within
  // AnchorLink. For instance, a newer version or a refactor of AnchorLink might have started calling
  // preventDefault() more consistently for internal navigation links if an onClick prop was present,
  // exposing the dormant issue described above.
  //
  // === The Solution ===
  // The strategy here is to separate NavLink's UI side effects from the Link component's click handling
  // that was triggering preventDefault():
  //   - The <Link> component is wrapped in a <span>.
  //   - NavLink's UI side effects (closing menus, calling any onClick prop passed to NavLink itself)
  //     are handled by `handleWrapperClick`, attached to this outer <span>.
  //   - Crucially, `handleWrapperClick` is *not* passed as the onClick prop to the <Link> component.
  //   - By not providing an onClick prop from NavLink to <Link>, the <Link>'s internal AnchorLink
  //     is not triggered by NavLink to call event.preventDefault().
  //   - This allows the click on the actual <a> tag (rendered by <Link>) to retain its default
  //     (not prevented by NavLink's logic) status when the native event reaches the global click handler.
  //     The global click handler can then correctly process it for client-side navigation.
  //
  // The `handleWrapperClick` event parameter type was changed (by the user) from React.MouseEvent<HTMLElement>
  // to MouseEvent, and the `as any` cast was removed when calling `propOnClickPassedToNavLink`,
  // aligning with the expected event types.
  const handleWrapperClick = (e: MouseEvent) => {
    dispatch(adt("toggleMobileMenu", false));
    dispatch(adt("toggleDesktopAccountDropdown", false));
    dispatch(adt("toggleDesktopContextualDropdown", false));
    dispatch(adt("toggleMobileContextualDropdown", false));

    if (propOnClickPassedToNavLink) {
      propOnClickPassedToNavLink(e);
    }
  };

  const calculatedClassNameForLink = `text-nowrap ${className || ""} ${
    active ? "fw-bold" : ""
  }`;

  let linkPropsToPass: LinkComponentPropsType;

  if (button) {
    linkPropsToPass = {
      ...restOfLinkComponentProps,
      dest: dest,
      children: children,
      className: calculatedClassNameForLink,
      color: navLinkColorInput,
      button: true
    };
  } else {
    linkPropsToPass = {
      ...restOfLinkComponentProps,
      dest: dest,
      children: children,
      className: calculatedClassNameForLink,
      color: navLinkColorInput || "c-nav-fg",
      button: button
    };
  }

  return (
    <span
      onClick={handleWrapperClick}
      className="nav-link-wrapper"
      style={{ display: "contents" }}>
      <Link {...linkPropsToPass} />
    </span>
  );
};

const ContextualDropdown: component_.base.View<
  component_.page.actions.Dropdown & {
    isOpen: boolean;
    dispatch: component_.base.Dispatch<Msg>;
    toggle(): void;
  }
> = (props) => {
  const { text, loading, linkGroups, isOpen, dispatch, toggle } = props;
  return (
    <ButtonDropdown isOpen={isOpen} toggle={() => toggle()}>
      <DropdownToggle tag="div">
        <Link
          symbol_={rightPlacement(iconLinkSymbol("caret-down"))}
          symbolClassName="me-n1"
          iconSymbolSize={DROPDOWN_CARET_SIZE}
          loading={loading}
          button
          size="sm"
          color="primary">
          {text}
        </Link>
      </DropdownToggle>
      <DropdownMenu right>
        {linkGroups.map((group, i) => (
          <Fragment key={`nav-contextual-dropdown-group-${i}`}>
            {group.label ? (
              <DropdownItem header>{group.label}</DropdownItem>
            ) : null}
            {group.links.map((link, j) => (
              <NavLink
                {...link}
                className={`${link.className || ""} dropdown-item`}
                button={false}
                color="body"
                dispatch={dispatch}
                key={`nav-contextual-dropdown-link-${i}-${j}`}
              />
            ))}
            {i < linkGroups.length - 1 ? <DropdownItem divider /> : null}
          </Fragment>
        ))}
      </DropdownMenu>
    </ButtonDropdown>
  );
};

export interface NavAccountDropdown extends component_.page.actions.Dropdown {
  imageUrl: string;
}

const NavAccountDropdown: component_.base.View<
  NavAccountDropdown & {
    isOpen: boolean;
    dispatch: component_.base.Dispatch<Msg>;
  }
> = (props) => {
  const { text, imageUrl, linkGroups, isOpen, dispatch } = props;
  return (
    <Dropdown
      isOpen={isOpen}
      toggle={() => dispatch(adt("toggleDesktopAccountDropdown"))}>
      <DropdownToggle
        tag="div"
        className="text-c-nav-fg text-hover-c-nav-fg"
        style={{ cursor: "pointer" }}>
        <span className="me-2 o-75">{text}</span>
        <img
          src={imageUrl}
          className="rounded-circle"
          style={{
            width: "2.75rem",
            height: "2.75rem",
            objectFit: "cover"
          }}
        />
        <Icon
          name="caret-down"
          color="c-nav-fg"
          className="ms-2"
          width={DROPDOWN_CARET_SIZE}
          height={DROPDOWN_CARET_SIZE}
        />
      </DropdownToggle>
      <DropdownMenu right>
        {linkGroups.map((group, i) => (
          <Fragment key={`nav-account-dropdown-group-${i}`}>
            {group.label ? (
              <DropdownItem header>{group.label}</DropdownItem>
            ) : null}
            {group.links.map((link, j) => (
              <NavLink
                {...link}
                className={`${link.className || ""} dropdown-item`}
                button={false}
                color="body"
                dispatch={dispatch}
                key={`nav-account-dropdown-link-${i}-${j}`}
              />
            ))}
            {i < linkGroups.length - 1 ? <DropdownItem divider /> : null}
          </Fragment>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

type TextAccountAction = ADT<"text", string>;
export const textLink = adtCurried<TextAccountAction>("text");

type LinkAccountAction = ADT<"link", NavLink>;
export const linkAccountAction = adtCurried<LinkAccountAction>("link");

type AccountAction = TextAccountAction | LinkAccountAction;

function isAccountActionActive(action: AccountAction): boolean {
  switch (action.tag) {
    case "text":
      return false;
    case "link":
      return !!action.value.active;
  }
}

function isAccountActionButton(action: AccountAction): boolean {
  switch (action.tag) {
    case "text":
      return false;
    case "link":
      return !!action.value.button;
  }
}

interface AccountActionProps {
  className?: string;
  color?: ThemeColor;
  action: AccountAction;
  dispatch: component_.base.Dispatch<Msg>;
}

const AccountAction: component_.base.View<AccountActionProps> = ({
  className = "",
  color = "c-nav-fg",
  action,
  dispatch
}) => {
  switch (action.tag) {
    case "text":
      return (
        <div className={`${className} o-75 text-${color}`}>{action.value}</div>
      );
    case "link":
      return (
        <NavLink
          className={className}
          color={color}
          {...action.value}
          focusable={false}
          dispatch={dispatch}
        />
      );
  }
};

type UnauthenticatedAccountMenu = ADT<"unauthenticated", AccountAction[]>;
export const unauthenticatedAccountMenu =
  adtCurried<UnauthenticatedAccountMenu>("unauthenticated");

type AuthenticatedDesktopAccountMenu = ADT<"authenticated", NavAccountDropdown>;
export const authenticatedDesktopAccountMenu =
  adtCurried<AuthenticatedDesktopAccountMenu>("authenticated");

type AuthenticatedMobileAccountMenu = ADT<"authenticated", AccountAction[][]>;
export const authenticatedMobileAccountMenu =
  adtCurried<AuthenticatedMobileAccountMenu>("authenticated");

type DesktopAccountMenu =
  | AuthenticatedDesktopAccountMenu
  | UnauthenticatedAccountMenu;

type MobileAccountMenu =
  | AuthenticatedMobileAccountMenu
  | UnauthenticatedAccountMenu;

export interface Props extends component_.base.ComponentViewProps<State, Msg> {
  logoImageUrl: string;
  title: string;
  homeDest?: Dest;
  isLoading: boolean;
  accountMenus: {
    mobile: MobileAccountMenu;
    desktop: DesktopAccountMenu;
  };
  appLinks: NavLink[];
  contextualActions?: component_.page.Actions;
}

const DesktopAccountMenu: component_.base.View<Props> = (props) => {
  const { accountMenus, state, dispatch } = props;
  const menu = accountMenus.desktop;
  switch (menu.tag) {
    case "unauthenticated":
      return (
        <Fragment>
          {menu.value.map((action, i) => (
            <AccountAction
              action={action}
              className={i !== menu.value.length - 1 ? "me-3" : ""}
              dispatch={dispatch}
              color="c-nav-fg"
              key={`desktop-account-menu-action-${i}`}
            />
          ))}
        </Fragment>
      );
    case "authenticated":
      return (
        <Fragment>
          <NavAccountDropdown
            {...menu.value}
            isOpen={state.isDesktopAccountDropdownOpen}
            dispatch={dispatch}
          />
        </Fragment>
      );
  }
};

const MobileAccountMenu: component_.base.View<Props> = (props) => {
  const menu = props.accountMenus.mobile;
  const viewActions = (actions: AccountAction[], marginClassName: string) => (
    <Fragment>
      {actions.map((action, i, arr) => {
        const clonedAction = { ...action };
        if (clonedAction.tag === "link" && clonedAction.value.button) {
          clonedAction.value = { ...clonedAction.value, size: "sm" as const };
        }
        const active = isAccountActionActive(action);
        const button = isAccountActionButton(action);
        return (
          <AccountAction
            action={clonedAction}
            color="c-nav-fg-alt"
            className={`${i !== arr.length - 1 ? marginClassName : ""} ${
              active && !button ? "fw-bold" : ""
            }`}
            dispatch={props.dispatch}
            key={`mobile-account-menu-action-${i}`}
          />
        );
      })}
    </Fragment>
  );
  switch (menu.tag) {
    case "unauthenticated":
      return <div className="d-flex">{viewActions(menu.value, "me-3")}</div>;
    case "authenticated":
      return (
        <div className="d-flex flex-column align-items-stretch">
          {menu.value.map((actions, i, arr) => {
            return (
              <div
                key={`mobile-account-menu-authenticated-actions-${i}`}
                className={`d-flex flex-column align-items-start ${
                  i < arr.length - 1 ? "pb-3 mb-3 border-bottom" : ""
                }`}>
                {viewActions(actions, "mb-3")}
              </div>
            );
          })}
        </div>
      );
  }
};

interface TitleProps extends Pick<Props, "title" | "homeDest"> {
  dispatch: component_.base.Dispatch<Msg>;
  className?: string;
  color?: ThemeColor;
}

const Title: component_.base.View<TitleProps> = ({
  title,
  homeDest,
  dispatch,
  color = "c-nav-fg",
  className = ""
}) => (
  <div className={`nav-title ${className}`}>
    <NavLink
      dispatch={dispatch}
      children={title}
      focusable={false}
      color={color}
      dest={homeDest}
      style={{ pointerEvents: homeDest ? undefined : "none" }}
      className="fw-bolder font-size-large"
    />
  </div>
);

const MobileMenu: component_.base.View<Props> = (props) => {
  const isMobileMenuOpen = props.state.isMobileMenuOpen;
  const { appLinks } = props;
  const linkClassName = (link: NavLink, numLinks: number, i: number) =>
    `${link.active && !link.button ? "fw-bold" : ""} ${
      i < numLinks - 1 ? "mb-3" : ""
    }`;
  return (
    <div className={`main-nav-mobile-menu ${isMobileMenuOpen ? "open" : ""}`}>
      <Container>
        <Row>
          <Col xs="12">
            <Title
              title={props.title}
              color="c-nav-fg-alt"
              homeDest={props.homeDest}
              dispatch={props.dispatch}
              className="d-inline-block mb-4"
            />
          </Col>
        </Row>
        {appLinks.length ? (
          <Row>
            <Col xs="12">
              <div className="pb-4 border-bottom mb-4 d-flex flex-column align-items-start">
                {appLinks.map((link, i) => (
                  <NavLink
                    {...link}
                    focusable={false}
                    dispatch={props.dispatch}
                    color="c-nav-fg-alt"
                    className={linkClassName(link, appLinks.length, i)}
                    key={`mobile-app-link-${i}`}
                  />
                ))}
              </div>
            </Col>
          </Row>
        ) : null}
        <Row>
          <Col xs="12">
            <MobileAccountMenu {...props} />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const TopNavbar: component_.base.View<Props> = (props) => {
  const { state, dispatch } = props; // isLoading
  const isLoading = true;
  return (
    <div className="main-nav-top-navbar-wrapper">
      <div className="main-nav-top-navbar">
        <Container className="h-100">
          <Row className="h-100">
            <Col
              xs="12"
              className="h-100 d-flex flex-nowrap align-items-center justify-content-between">
              <div className="d-flex align-items-center flex-grow-1">
                <Link
                  dest={props.homeDest}
                  style={{ pointerEvents: props.homeDest ? undefined : "none" }}
                  className="align-self-stretch d-flex align-items-center">
                  <img src={props.logoImageUrl} style={{ height: "42px" }} />
                </Link>
                <Title
                  title={props.title}
                  homeDest={props.homeDest}
                  dispatch={dispatch}
                  className="ms-3 d-none d-md-block"
                />
                {isLoading ? (
                  <Spinner
                    size="sm"
                    color="secondary"
                    className="transition-indicator ms-3"
                  />
                ) : null}
              </div>
              <div className="d-none d-md-flex align-items-center flex-shrink-0">
                <DesktopAccountMenu {...props} />
              </div>
              <div className="d-md-none">
                <Icon
                  hover
                  width={1.4}
                  height={1.4}
                  name={state.isMobileMenuOpen ? "times" : "bars"}
                  color="c-nav-fg"
                  onClick={() => dispatch(adt("toggleMobileMenu"))}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </div>
      <MobileMenu {...props} />
    </div>
  );
};

const ContextualLinks: component_.base.View<
  Props & { isOpen: boolean; toggle(): void }
> = (props) => {
  const { contextualActions, dispatch, isOpen, toggle } = props;
  if (!contextualActions) {
    return null;
  }
  switch (contextualActions.tag) {
    case "none":
      return null;
    case "links":
      return (
        <div
          className="d-flex flex-nowrap align-items-center flex-row-reverse py-1 pe-1 me-n1"
          style={{ overflowX: "auto" }}>
          {contextualActions.value.map((link, i) => {
            const linkProps = {
              ...link,
              color: link.color || "c-nav-fg-alt",
              size: link.button ? "sm" : undefined,
              className: `ms-3 ${link.button ? "" : "font-size-small"}`
            } as NavLink;
            return (
              <NavLink
                {...linkProps}
                dispatch={dispatch}
                key={`contextual-link-${i}`}
              />
            );
          })}
        </div>
      );
    case "dropdown":
      return (
        <div className="py-1 pe-1 me-n1">
          <ContextualDropdown
            {...contextualActions.value}
            isOpen={isOpen}
            dispatch={dispatch}
            toggle={toggle}
          />
        </div>
      );
  }
};

const DesktopBottomNavbar: component_.base.View<Props> = (props) => {
  const { appLinks, contextualActions } = props;
  const linkClassName = (link: NavLink) =>
    `${link.active && !link.button ? "fw-bold" : ""}`;
  if (!appLinks.length && !contextualActions) {
    return null;
  }
  return (
    <div className="main-nav-bottom-navbar desktop">
      <Container className="h-100">
        <Row className="h-100">
          <Col
            xs="12"
            className="h-100 d-flex flex-nowrap align-items-center justify-content-between">
            <div className="d-flex flex-nowrap">
              {appLinks.map((link, i) => (
                <Fragment key={`app-link-${i}`}>
                  <NavLink
                    {...link}
                    dispatch={props.dispatch}
                    color="c-nav-fg-alt"
                    className={linkClassName(link)}
                  />
                  {i < appLinks.length - 1 ? (
                    <Separator spacing="2" color="c-nav-bg" className="o-50">
                      |
                    </Separator>
                  ) : null}
                </Fragment>
              ))}
            </div>
            <ContextualLinks
              {...props}
              isOpen={props.state.isDesktopContextualDropdownOpen}
              toggle={() =>
                props.dispatch(adt("toggleDesktopContextualDropdown"))
              }
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const MobileBottomNavbar: component_.base.View<Props> = (props) => {
  const { contextualActions } = props;
  if (
    !contextualActions ||
    (contextualActions.tag === "links" && !contextualActions.value.length)
  ) {
    return null;
  }
  return (
    <div className="main-nav-bottom-navbar mobile">
      <Container className="h-100">
        <Row className="h-100">
          <Col
            xs="12"
            className="h-100 d-flex flex-nowrap align-items-center justify-content-end">
            <ContextualLinks
              {...props}
              isOpen={props.state.isMobileContextualDropdownOpen}
              toggle={() =>
                props.dispatch(adt("toggleMobileContextualDropdown"))
              }
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export const view: component_.base.View<Props> = (props) => {
  return (
    <nav className="main-nav d-print-none">
      <TopNavbar {...props} />
      <DesktopBottomNavbar {...props} />
      <MobileBottomNavbar {...props} />
    </nav>
  );
};
