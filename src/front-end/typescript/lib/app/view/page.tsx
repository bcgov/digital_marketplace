import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import getAppAlerts from "front-end/lib/app/alerts";
import {
  Msg,
  Route,
  InnerMsg,
  SharedState,
  State
} from "front-end/lib/app/types";
import { Immutable, component as component_ } from "front-end/lib/framework";
import { ThemeColor } from "front-end/lib/types";
import {
  setupCopilotSidebarPositioning,
  setupCopilotKitTextReplacement
} from "front-end/lib/utils/copilotkit";
import Icon from "front-end/lib/views/icon";
import Link from "front-end/lib/views/link";
import React, { ReactElement, useEffect } from "react";
import {
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Col,
  Container,
  Row
} from "reactstrap";
import { ADT } from "shared/lib/types";

export interface ViewAlertProps<Msg> {
  messages: Array<component_.page.alerts.Alert<Msg>>;
  dispatch: component_.base.Dispatch<Msg>;
  color: ThemeColor;
  className?: string;
}

export function ViewAlert<Msg>({
  messages,
  dispatch,
  color,
  className = ""
}: ViewAlertProps<Msg>) {
  if (!messages.length) {
    return null;
  }
  return (
    <Alert color={color} className={`${className} p-0`} fade={false}>
      {messages.map(({ text, dismissMsg }, i) => (
        <div key={`alert-${color}-${i}`}>
          <div
            className="d-flex align-items-start"
            style={{ padding: "0.75rem 1.25rem" }}>
            <div className="flex-grow-1 pe-3">{text}</div>
            {dismissMsg ? (
              <Icon
                hover
                name="times"
                width={1}
                height={1}
                color={color}
                onClick={() => dispatch(dismissMsg)}
                className="mt-1 o-75 flex-grow-0 flex-shrink-0"
              />
            ) : null}
          </div>
          {i === messages.length - 1 ? null : (
            <div className={`border-bottom border-${color} o-25 w-100`}></div>
          )}
        </div>
      ))}
    </Alert>
  );
}

export interface ViewAlertsProps<Msg> {
  alerts: component_.page.Alerts<Msg>;
  dispatch: component_.base.Dispatch<Msg>;
}

export function ViewAlerts<Msg>({ alerts, dispatch }: ViewAlertsProps<Msg>) {
  const { info = [], warnings = [], errors = [] } = alerts;
  //Show highest priority alerts first.
  return (
    <Row>
      <Col xs="12">
        <ViewAlert messages={errors} dispatch={dispatch} color="danger" />
        <ViewAlert messages={warnings} dispatch={dispatch} color="warning" />
        <ViewAlert messages={info} dispatch={dispatch} color="primary" />
      </Col>
    </Row>
  );
}

interface ViewBreadcrumbsProps {
  breadcrumbs: component_.page.Breadcrumbs<Msg>;
  dispatch: component_.base.Dispatch<Msg>;
}

function ViewBreadcrumbs(
  props: ViewBreadcrumbsProps
): ReactElement<ViewBreadcrumbsProps> | null {
  const { dispatch, breadcrumbs } = props;
  if (!breadcrumbs.length) {
    return null;
  }
  return (
    <Breadcrumb
      className="d-none d-md-block"
      listClassName="bg-transparent p-0 mb-3">
      {breadcrumbs.map(({ text, onClickMsg }, i) => {
        const onClick = () => {
          if (onClickMsg) {
            dispatch(onClickMsg);
          }
        };
        return (
          <BreadcrumbItem
            key={`breadcrumb-${i}`}
            active={i === breadcrumbs.length - 1}>
            {onClickMsg ? <Link onClick={onClick}>{text}</Link> : text}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}

type ViewAlertsAndBreadcrumbsProps = ViewAlertsProps<Msg> &
  ViewBreadcrumbsProps & { container?: boolean; className?: string };

function ViewAlertsAndBreadcrumbs(props: ViewAlertsAndBreadcrumbsProps) {
  const { dispatch, alerts, breadcrumbs, container = false } = props;
  const hasAlerts = !!(
    alerts.info?.length ||
    alerts.warnings?.length ||
    alerts.errors?.length
  );
  const hasBreadcrumbs = !!breadcrumbs.length;
  const className = `${hasAlerts ? "pb-5 mb-n3" : ""} ${
    !hasAlerts && hasBreadcrumbs ? "pb-md-5 mb-md-n3" : ""
  } ${props.className || ""}`;
  if (container) {
    return (
      <Container className={className}>
        <ViewAlerts dispatch={dispatch} alerts={alerts} />
        <ViewBreadcrumbs dispatch={dispatch} breadcrumbs={breadcrumbs} />
      </Container>
    );
  } else {
    return (
      <div className={className}>
        <ViewAlerts dispatch={dispatch} alerts={alerts} />
        <ViewBreadcrumbs dispatch={dispatch} breadcrumbs={breadcrumbs} />
      </div>
    );
  }
}

export interface Props<RouteParams, PageState, PageMsg> {
  state: Immutable<State>;
  dispatch: component_.base.Dispatch<Msg>;
  component: component_.page.Component<
    RouteParams,
    SharedState,
    PageState,
    PageMsg,
    Route
  >;
  pageState?: Immutable<PageState>;
  mapPageMsg(msg: PageMsg): InnerMsg;
  onSidebarOpen?: (isOpen: boolean) => void;
}

export function view<
  RouteParams,
  PageState,
  PageMsg extends ADT<unknown, unknown>
>(props: Props<RouteParams, PageState, PageMsg>) {
  const { state, dispatch, mapPageMsg, component, pageState, onSidebarOpen } =
    props;

  // Setup CopilotKit sidebar positioning
  useEffect(() => {
    return setupCopilotSidebarPositioning();
  }, []);

  // Setup CopilotKit text replacement
  useEffect(() => {
    return setupCopilotKitTextReplacement();
  }, []);

  // pageState is undefined, so redirect to 404 page.
  // This shouldn't happen.
  if (!pageState) return null;
  // pageState is defined, render page.
  const {
    sidebar,
    getBreadcrumbs = component_.page.breadcrumbs.empty,
    getAlerts = component_.page.alerts.empty,
    fullWidth = false,
    backgroundColor = "white"
  } = component;
  const dispatchPage = component_.app.mapDispatch<InnerMsg, PageMsg, Route>(
    dispatch,
    mapPageMsg
  );
  // Get the sidebar callback from the component if available, otherwise use the prop
  const componentCallback = component.getSidebarOpenCallback
    ? component.getSidebarOpenCallback(pageState)
    : undefined;

  const effectiveCallback = componentCallback || onSidebarOpen;

  const viewProps = {
    dispatch: dispatchPage,
    state: pageState,
    onSidebarOpen: effectiveCallback
  };
  const appAlerts = getAppAlerts({ state, dispatch });
  const pageAlerts = component_.page.alerts.map(
    getAlerts(pageState),
    mapPageMsg
  );
  const viewAlertsAndBreadcrumbsProps = {
    dispatch,
    alerts: component_.page.alerts.merge(appAlerts, pageAlerts),
    breadcrumbs: component_.page.breadcrumbs.map(
      getBreadcrumbs(pageState),
      mapPageMsg
    )
  };
  const backgroundClassName = `bg-${backgroundColor}`;
  // Handle full width pages.
  if (fullWidth) {
    // Do not show sidebar on fullWidth pages.
    // No sidebar.
    return (
      <div
        className={`d-flex flex-column flex-grow-1 page-container ${backgroundClassName}`}>
        <CopilotKit
          showDevConsole={false}
          runtimeUrl={
            (process.env.VITE_AI_SERVICE_URL || "http://localhost:5000") +
            "/copilotkit"
          }>
          <ViewAlertsAndBreadcrumbs
            {...viewAlertsAndBreadcrumbsProps}
            container
            className="pt-4 pt-md-6"
          />
          <component.view {...viewProps} />
          <CopilotSidebar
            onSetOpen={
              effectiveCallback ||
              ((isOpen: boolean) => {
                console.log("sidebar open default", isOpen);
              })
            }
          />
        </CopilotKit>
      </div>
    );
  } else {
    // Handle pages within a container.
    if (sidebar) {
      const sidebarColWidth: number = (() => {
        switch (sidebar.size) {
          case "medium":
            return 3;
          case "large":
            return 4;
        }
      })();
      const isEmptyOnMobile =
        sidebar.isEmptyOnMobile && sidebar.isEmptyOnMobile(viewProps.state);
      return (
        <div
          className={`d-flex flex-column flex-grow-1 page-container ${backgroundClassName}`}>
          <CopilotKit
            showDevConsole={false}
            runtimeUrl={
              (process.env.VITE_AI_SERVICE_URL || "http://localhost:5000") +
              "/copilotkit"
            }>
            <div className="d-flex flex-column flex-grow-1">
              <Container className="position-relative flex-grow-1 d-md-flex flex-md-column align-items-md-stretch">
                <div
                  className={`d-none d-md-block position-absolute bg-${sidebar.color}`}
                  style={{
                    top: 0,
                    right: "100%",
                    bottom: 0,
                    width: "50vw"
                  }}></div>
                <Row className="flex-grow-1 align-content-start align-content-md-stretch">
                  <Col
                    xs="12"
                    md={sidebarColWidth}
                    className={`sidebar bg-${
                      sidebar.color
                    } pe-md-4 pe-lg-5 d-flex flex-column align-items-stretch pt-4 pt-md-6 align-self-start align-self-md-stretch ${
                      isEmptyOnMobile ? "pb-md-6" : "pb-5"
                    }`}>
                    <ViewAlertsAndBreadcrumbs
                      {...viewAlertsAndBreadcrumbsProps}
                      className="d-md-none"
                    />
                    <sidebar.view {...viewProps} />
                  </Col>
                  <Col
                    xs="12"
                    md={{ size: 12 - 1 - sidebarColWidth, offset: 1 }}
                    className="pt-md-6 pb-6">
                    <ViewAlertsAndBreadcrumbs
                      {...viewAlertsAndBreadcrumbsProps}
                      className="d-none d-md-block"
                    />
                    <component.view {...viewProps} />
                  </Col>
                </Row>
              </Container>
            </div>
            <CopilotSidebar
              onSetOpen={
                effectiveCallback ||
                ((isOpen: boolean) => {
                  console.log("sidebar open default", isOpen);
                })
              }
            />
          </CopilotKit>
        </div>
      );
    } else {
      // No sidebar.
      return (
        <div
          className={`d-flex flex-column flex-grow-1 page-container ${backgroundClassName}`}>
          <CopilotKit
            showDevConsole={false}
            runtimeUrl={
              (process.env.VITE_AI_SERVICE_URL || "http://localhost:5000") +
              "/copilotkit"
            }>
            <Container className="pt-4 pt-md-6 pb-6 flex-grow-1">
              <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} />
              <component.view {...viewProps} />
              <CopilotSidebar
                onSetOpen={
                  effectiveCallback ||
                  ((isOpen: boolean) => {
                    console.log("sidebar open default", isOpen);
                  })
                }
              />
            </Container>
          </CopilotKit>
        </div>
      );
    }
  }
}

export default view;
