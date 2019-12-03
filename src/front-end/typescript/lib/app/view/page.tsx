import { Msg, Route, SharedState } from 'front-end/lib/app/types';
import { AppMsg, Dispatch, emptyPageAlerts, emptyPageBreadcrumbs, GlobalComponentMsg, Immutable, mapAppDispatch, newRoute, PageAlerts, PageBreadcrumbs, PageComponent, View } from 'front-end/lib/framework';
import Link from 'front-end/lib/views/link';
import { default as React, ReactElement } from 'react';
import { Alert, Breadcrumb, BreadcrumbItem, Col, Container, Row } from 'reactstrap';

interface ViewAlertProps {
  messages: Array<string | ReactElement>;
  color: 'info' | 'warning' | 'danger';
  className?: string;
}

const ViewAlert: View<ViewAlertProps> = ({ messages, color, className }) => {
  if (!messages.length) { return null; }
  return (
    <Alert color={color} className={className} fade={false}>
      {messages.map((text, i)  => (<div key={`alert-${color}-${i}`}>{text}</div>))}
    </Alert>
  );
};

interface ViewAlertsProps {
  alerts: PageAlerts;
}

const ViewAlerts: View<ViewAlertsProps> = ({ alerts }) => {
  const { info, warnings, errors } = alerts;
  return (
    <Row>
      <Col xs='12'>
        <ViewAlert messages={info} color='info' />
        <ViewAlert messages={warnings} color='warning' />
        <ViewAlert messages={errors} color='danger' className='mb-0' />
      </Col>
    </Row>
  );
};

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

type ViewAlertsAndBreadcrumbsProps<PageMsg> = ViewAlertsProps & ViewBreadcrumbsProps<PageMsg> & { container?: boolean };

function ViewAlertsAndBreadcrumbs<PageMsg>(props: ViewAlertsAndBreadcrumbsProps<PageMsg>) {
  const { dispatchPage, alerts, breadcrumbs, container = false } = props;
  const hasAlerts = alerts.info.length || alerts.warnings.length || alerts.errors.length;
  const hasBreadcrumbs = !!breadcrumbs.length;
  const className = `${hasAlerts ? 'pb-5 mb-n4' : ''} ${hasBreadcrumbs ? 'pb-md-5 mb-md-n4' : ''}`;
  if (container) {
    return (
      <Container className={`${className} pt-5`}>
        <ViewBreadcrumbs dispatchPage={dispatchPage} breadcrumbs={breadcrumbs} />
        <ViewAlerts alerts={alerts} />
      </Container>
    );
  } else {
    return (
      <div className={className}>
        <ViewBreadcrumbs dispatchPage={dispatchPage} breadcrumbs={breadcrumbs} />
        <ViewAlerts alerts={alerts} />
      </div>
    );
  }
}

export interface Props<PageState, PageMsg> {
  dispatch: Dispatch<AppMsg<Msg, Route>>;
  component: PageComponent<never, SharedState, PageState, GlobalComponentMsg<PageMsg, Route>>;
  pageState?: Immutable<PageState>;
  mapPageMsg(msg: GlobalComponentMsg<PageMsg, Route>): Msg;
}

export function view<PageState, PageMsg>(props: Props<PageState, PageMsg>) {
  const { dispatch, mapPageMsg, component, pageState } = props;
  // pageState is undefined, so redirect to 404 page.
  // This shouldn't happen.
  if (!pageState) {
    dispatch(newRoute({
      tag: 'notice' as 'notice',
      value: {
        noticeId: {
          tag: 'notFound' as 'notFound',
          value: undefined
        }
      }
    }));
    return null;
  }
  // pageState is defined, render page.
  const {
    viewBottomBar,
    getBreadcrumbs = emptyPageBreadcrumbs,
    getAlerts = emptyPageAlerts,
    containerOptions = {}
  } = component;
  const { fullWidth = false } = containerOptions;
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
    // Do not show vertical bar on fullWidth pages.
    // No vertical bar.
    return (
      <div className='d-flex flex-column flex-grow-1 page-container'>
        <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} container />
        <component.view {...viewProps} />
        {bottomBar}
      </div>
    );
  } else {
    // Handle pages within a container.
    if (component.viewVerticalBar) {
      return (
        <div className='d-flex flex-column flex-grow-1 page-container'>
          <div className='d-flex flex-column flex-grow-1'>
            <Container className='position-relative flex-grow-1 d-md-flex flex-md-column align-items-md-stretch'>
              <div className='d-none d-md-block position-absolute bg-light' style={{ top: 0, right: '100%', bottom: 0, width: '50vw' }}></div>
              <Row className='flex-grow-1'>
                <Col xs='12' md='4' className='vertical-bar px-md-4 d-flex flex-column align-items-stretch py-5'>
                  <component.viewVerticalBar {...viewProps} />
                </Col>
                <Col xs='12' className='d-block d-md-none'>
                  <div className='w-100 border-bottom'></div>
                </Col>
                <Col xs='12' md='8' className={`pl-md-4 py-5`}>
                  <ViewAlertsAndBreadcrumbs {...viewAlertsAndBreadcrumbsProps} />
                  <component.view {...viewProps} />
                </Col>
              </Row>
            </Container>
          </div>
          {bottomBar}
        </div>
      );
    } else {
      // No vertical bar.
      return (
        <div className='d-flex flex-column flex-grow-1 page-container'>
          <Container className='py-5'>
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
