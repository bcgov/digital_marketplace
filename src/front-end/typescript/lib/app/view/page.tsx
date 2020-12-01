import getAppAlerts from 'front-end/lib/app/alerts';
import { Msg, Route, SharedState, State } from 'front-end/lib/app/types';
import { Dispatch, emptyPageAlerts, emptyPageBreadcrumbs, GlobalComponentMsg, Immutable, mapAppDispatch, mapPageAlerts, mapPageBreadcrumbsMsg, mergePageAlerts, newRoute, PageAlert, PageAlerts, PageBreadcrumbs, PageComponent } from 'front-end/lib/framework';
import { ThemeColor } from 'front-end/lib/types';
import Icon from 'front-end/lib/views/icon';
import Link from 'front-end/lib/views/link';
import React, { ReactElement } from 'react';
import { Alert, Breadcrumb, BreadcrumbItem, Col, Container, Row } from 'reactstrap';
import { adt } from 'shared/lib/types';

interface ViewAlertProps {
  messages: Array<PageAlert<Msg>>;
  dispatch: Dispatch<Msg>;
  color: ThemeColor;
  className?: string;
}

function ViewAlert({ messages, dispatch, color, className = '' }: ViewAlertProps) {
  if (!messages.length) { return null; }
  return (
    <Alert color={color} className={`${className} p-0`} fade={false}>
      {messages.map(({ text, dismissMsg }, i)  => (
        <div key={`alert-${color}-${i}`}>
          <div className='d-flex align-items-start' style={{ padding: '0.75rem 1.25rem' }}>
            <div className='flex-grow-1 pr-3'>{text}</div>
            {dismissMsg
              ? (<Icon
                  hover
                  name='times'
                  width={1}
                  height={1}
                  color={color}
                  onClick={() => dispatch(dismissMsg)}
                  className='mt-1 o-75 flex-grow-0 flex-shrink-0' />)
              : null}
          </div>
          {i === messages.length - 1
            ? null
            : (<div className={`border-bottom border-${color} o-25 w-100`}></div>)}
        </div>
      ))}
    </Alert>
  );
}

interface ViewAlertsProps {
  alerts: PageAlerts<Msg>;
  dispatch: Dispatch<Msg>;
}

function ViewAlerts({ alerts, dispatch }: ViewAlertsProps) {
  const { info = [], warnings = [], errors = [] } = alerts;
  //Show highest priority alerts first.
  return (
    <Row>
      <Col xs='12'>
        <ViewAlert messages={errors} dispatch={dispatch} color='danger' />
        <ViewAlert messages={warnings} dispatch={dispatch} color='warning' />
        <ViewAlert messages={info} dispatch={dispatch} color='primary' />
      </Col>
    </Row>
  );
}

interface ViewBreadcrumbsProps {
  breadcrumbs: PageBreadcrumbs<Msg>;
  dispatch: Dispatch<Msg>;
}

function ViewBreadcrumbs(props: ViewBreadcrumbsProps): ReactElement<ViewBreadcrumbsProps> | null {
  const { dispatch, breadcrumbs } = props;
  if (!breadcrumbs.length) { return null; }
  return (
    <Breadcrumb className='d-none d-md-block' listClassName='bg-transparent p-0 mb-3'>
      {breadcrumbs.map(({ text, onClickMsg }, i) => {
        const onClick = () => {
          if (onClickMsg) { dispatch(onClickMsg); }
        };
        return (
          <BreadcrumbItem key={`breadcrumb-${i}`} active={i === breadcrumbs.length - 1}>
            {onClickMsg ? (<Link onClick={onClick}>{text}</Link>) : text}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}

type ViewAlertsAndBreadcrumbsProps = ViewAlertsProps & ViewBreadcrumbsProps & { container?: boolean; className?: string; };

function ViewAlertsAndBreadcrumbs(props: ViewAlertsAndBreadcrumbsProps) {
  const { dispatch, alerts, breadcrumbs, container = false } = props;
  const hasAlerts = !!(alerts.info?.length || alerts.warnings?.length || alerts.errors?.length);
  const hasBreadcrumbs = !!breadcrumbs.length;
  const className = `${hasAlerts ? 'pb-5 mb-n3' : ''} ${!hasAlerts && hasBreadcrumbs ? 'pb-md-5 mb-md-n3' : ''} ${props.className || ''}`;
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
  dispatch: Dispatch<Msg>;
  component: PageComponent<RouteParams, SharedState, PageState, GlobalComponentMsg<PageMsg, Route>>;
  pageState?: Immutable<PageState>;
  mapPageMsg(msg: GlobalComponentMsg<PageMsg, Route>): Msg;
}

export function view<RouteParams, PageState, PageMsg>(props: Props<RouteParams, PageState, PageMsg>) {
  const { state, dispatch, mapPageMsg, component, pageState } = props;
  // pageState is undefined, so redirect to 404 page.
  // This shouldn't happen.
  if (!pageState) {
    dispatch(newRoute(adt('notFound' as const, {})));
    return null;
  }
  // pageState is defined, render page.
  const {
    sidebar,
    getBreadcrumbs = emptyPageBreadcrumbs,
    getAlerts = emptyPageAlerts,
    fullWidth = false,
    backgroundColor = 'white'
  } = component;
  const dispatchPage: Dispatch<GlobalComponentMsg<PageMsg, Route>> = mapAppDispatch(dispatch, mapPageMsg);
  const viewProps = {
    dispatch: dispatchPage,
    state: pageState
  };
  const appAlerts = getAppAlerts({ state, dispatch });
  const pageAlerts = mapPageAlerts(getAlerts(pageState), mapPageMsg);
  const viewAlertsAndBreadcrumbsProps = {
    dispatch,
    alerts: mergePageAlerts(appAlerts, pageAlerts),
    breadcrumbs: mapPageBreadcrumbsMsg(getBreadcrumbs(pageState), mapPageMsg)
  };
  const backgroundClassName = `bg-${backgroundColor}`;
  // Handle full width pages.
  if (fullWidth) {
    // Do not show sidebar on fullWidth pages.
    // No sidebar.
    return (
      <div className={`d-flex flex-column flex-grow-1 page-container ${backgroundClassName}`}>
        <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} container className='pt-4 pt-md-6' />
        <component.view {...viewProps} />
      </div>
    );
  } else {
    // Handle pages within a container.
    if (sidebar) {
      const sidebarColWidth: number = (() => {
        switch (sidebar.size) {
          case 'medium': return 3;
          case 'large': return 4;
        }
      })();
      const isEmptyOnMobile = sidebar.isEmptyOnMobile && sidebar.isEmptyOnMobile(viewProps.state);
      return (
        <div className={`d-flex flex-column flex-grow-1 page-container ${backgroundClassName}`}>
          <div className='d-flex flex-column flex-grow-1'>
            <Container className='position-relative flex-grow-1 d-md-flex flex-md-column align-items-md-stretch'>
              <div className={`d-none d-md-block position-absolute bg-${sidebar.color}`} style={{ top: 0, right: '100%', bottom: 0, width: '50vw' }}></div>
              <Row className='flex-grow-1 align-content-start align-content-md-stretch'>
                <Col xs='12' md={sidebarColWidth} className={`sidebar bg-${sidebar.color} pr-md-4 pr-lg-5 d-flex flex-column align-items-stretch pt-4 pt-md-6 align-self-start align-self-md-stretch ${isEmptyOnMobile ? 'pb-md-6' : 'pb-5'}`}>
                  <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} className='d-md-none' />
                  <sidebar.view {...viewProps} />
                </Col>
                <Col xs='12' md={{ size: 12 - 1 - sidebarColWidth, offset: 1 }} className='pt-md-6 pb-6'>
                  <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} className='d-none d-md-block' />
                  <component.view {...viewProps} />
                </Col>
              </Row>
            </Container>
          </div>
        </div>
      );
    } else {
      // No sidebar.
      return (
        <div className={`d-flex flex-column flex-grow-1 page-container ${backgroundClassName}`}>
          <Container className='pt-4 pt-md-6 pb-6 flex-grow-1'>
            <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} />
            <component.view {...viewProps} />
          </Container>
        </div>
      );
    }
  }
}

export default view;
