import { Msg, Route, SharedState } from 'front-end/lib/app/types';
import { AppMsg, Dispatch, emptyPageAlerts, emptyPageBreadcrumbs, GlobalComponentMsg, Immutable, mapAppDispatch, newRoute, PageAlert, PageAlerts, PageBreadcrumbs, PageComponent } from 'front-end/lib/framework';
import Icon from 'front-end/lib/views/icon';
import Link from 'front-end/lib/views/link';
import React, { ReactElement } from 'react';
import { Alert, Breadcrumb, BreadcrumbItem, Col, Container, Row } from 'reactstrap';
import { adt } from 'shared/lib/types';

interface ViewAlertProps<PageMsg> {
  messages: Array<PageAlert<GlobalComponentMsg<PageMsg, Route>>>;
  dispatchPage: Dispatch<GlobalComponentMsg<PageMsg, Route>>;
  color: 'info' | 'warning' | 'danger';
  className?: string;
}

function ViewAlert<PageMsg>({ messages, dispatchPage, color, className = '' }: ViewAlertProps<PageMsg>) {
  if (!messages.length) { return null; }
  return (
    <Alert color={color} className={`${className} p-0`} fade={false}>
      {messages.map(({ text, dismissMsg }, i)  => (
        <div key={`alert-${color}-${i}`}>
          <div className='d-flex align-items-start p-3'>
            <div className='flex-grow-1 pr-3'>{text}</div>
            {dismissMsg
              ? (<Icon
                  name='times'
                  width={1}
                  height={1}
                  color={color}
                  onClick={() => dispatchPage(dismissMsg)}
                  style={{ cursor: 'pointer' }}
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

interface ViewAlertsProps<PageMsg> {
  alerts: PageAlerts<GlobalComponentMsg<PageMsg, Route>>;
  dispatchPage: Dispatch<GlobalComponentMsg<PageMsg, Route>>;
}

function ViewAlerts<PageMsg>({ alerts, dispatchPage }: ViewAlertsProps<PageMsg>) {
  const { info, warnings, errors } = alerts;
  return (
    <Row>
      <Col xs='12'>
        <ViewAlert messages={info} dispatchPage={dispatchPage} color='info' />
        <ViewAlert messages={warnings} dispatchPage={dispatchPage} color='warning' />
        <ViewAlert messages={errors} dispatchPage={dispatchPage} color='danger' className='mb-0' />
      </Col>
    </Row>
  );
}

interface ViewBreadcrumbsProps<PageMsg> {
  breadcrumbs: PageBreadcrumbs<GlobalComponentMsg<PageMsg, Route>>;
  dispatchPage: Dispatch<GlobalComponentMsg<PageMsg, Route>>;
}

function ViewBreadcrumbs<PageMsg>(props: ViewBreadcrumbsProps<PageMsg>): ReactElement<ViewBreadcrumbsProps<PageMsg>> | null {
  const { dispatchPage, breadcrumbs } = props;
  if (!breadcrumbs.length) { return null; }
  return (
    <Breadcrumb className='d-none d-md-block' listClassName='bg-transparent p-0'>
      {breadcrumbs.map(({ text, onClickMsg }, i) => {
        const onClick = () => {
          if (onClickMsg) { dispatchPage(onClickMsg); }
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

type ViewAlertsAndBreadcrumbsProps<PageMsg> = ViewAlertsProps<PageMsg> & ViewBreadcrumbsProps<PageMsg> & { container?: boolean; className?: string; };

function ViewAlertsAndBreadcrumbs<PageMsg>(props: ViewAlertsAndBreadcrumbsProps<PageMsg>) {
  const { dispatchPage, alerts, breadcrumbs, container = false } = props;
  const hasAlerts = alerts.info.length || alerts.warnings.length || alerts.errors.length;
  const hasBreadcrumbs = !!breadcrumbs.length;
  const className = `${hasAlerts ? 'pb-5 mb-n4' : ''} ${hasBreadcrumbs ? 'pb-md-5 mb-md-n4' : ''} ${props.className || ''}`;
  if (container) {
    return (
      <Container className={`${className} pt-5`}>
        <ViewBreadcrumbs dispatchPage={dispatchPage} breadcrumbs={breadcrumbs} />
        <ViewAlerts dispatchPage={dispatchPage} alerts={alerts} />
      </Container>
    );
  } else {
    return (
      <div className={`${className} ${hasAlerts || hasBreadcrumbs ? 'mt-md-n5' : ''}`}>
        <ViewBreadcrumbs dispatchPage={dispatchPage} breadcrumbs={breadcrumbs} />
        <ViewAlerts dispatchPage={dispatchPage} alerts={alerts} />
      </div>
    );
  }
}

export interface Props<RouteParams, PageState, PageMsg> {
  dispatch: Dispatch<AppMsg<Msg, Route>>;
  component: PageComponent<RouteParams, SharedState, PageState, GlobalComponentMsg<PageMsg, Route>>;
  pageState?: Immutable<PageState>;
  mapPageMsg(msg: GlobalComponentMsg<PageMsg, Route>): Msg;
}

export function view<RouteParams, PageState, PageMsg>(props: Props<RouteParams, PageState, PageMsg>) {
  const { dispatch, mapPageMsg, component, pageState } = props;
  // pageState is undefined, so redirect to 404 page.
  // This shouldn't happen.
  if (!pageState) {
    dispatch(newRoute(adt('notice' as const, adt('notFound' as const))));
    return null;
  }
  // pageState is defined, render page.
  const {
    viewBottomBar,
    sidebar,
    getBreadcrumbs = emptyPageBreadcrumbs,
    getAlerts = emptyPageAlerts,
    fullWidth = false
  } = component;
  const dispatchPage: Dispatch<GlobalComponentMsg<PageMsg, Route>> = mapAppDispatch(dispatch, mapPageMsg);
  const viewProps = {
    dispatch: dispatchPage,
    state: pageState
  };
  const viewAlertsAndBreadcrumbsProps = {
    dispatchPage,
    alerts: getAlerts(pageState),
    breadcrumbs: getBreadcrumbs(pageState)
  };
  // View bottom bar.
  const bottomBar = viewBottomBar ? viewBottomBar(viewProps) : null;
  // Handle full width pages.
  if (fullWidth) {
    // Do not show sidebar on fullWidth pages.
    // No sidebar.
    return (
      <div className='d-flex flex-column flex-grow-1 page-container'>
        <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} container />
        <component.view {...viewProps} />
        {bottomBar}
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
      return (
        <div className='d-flex flex-column flex-grow-1 page-container'>
          <div className='d-flex flex-column flex-grow-1'>
            <Container className='position-relative flex-grow-1 d-md-flex flex-md-column align-items-md-stretch'>
              <div className={`d-none d-md-block position-absolute bg-${sidebar.color}`} style={{ top: 0, right: '100%', bottom: 0, width: '50vw' }}></div>
              <Row className='flex-grow-1'>
                <Col xs='12' md={sidebarColWidth} className={`sidebar bg-${sidebar.color} pr-md-4 d-flex flex-column align-items-stretch pt-3 pt-md-8 pb-5`}>
                  <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} className='d-md-none' />
                  <sidebar.view {...viewProps} />
                </Col>
                <Col xs='12' md={{ size: 12 - 1 - sidebarColWidth, offset: 1 }} className='pt-md-8 pb-5'>
                  <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} className='d-none d-md-block' />
                  <component.view {...viewProps} />
                </Col>
              </Row>
            </Container>
          </div>
          {bottomBar}
        </div>
      );
    } else {
      // No sidebar.
      return (
        <div className='d-flex flex-column flex-grow-1 page-container'>
          <Container className='pt-3 pt-md-8 pb-5'>
            <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} />
            <component.view {...viewProps} />
          </Container>
          {bottomBar}
        </div>
      );
    }
  }
}

export default view;
