import {
  CWU_PAYMENT_OPTIONS_URL,
  CWU_COST_RECOVERY_FIGURE
} from "front-end/config";
import { makePageMetadata, prefixPath } from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import Accordion from "front-end/lib/views/accordion";
import HowItWorksItem from "front-end/lib/views/how-it-works-item";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Container, Row } from "reactstrap";
import { COPY } from "shared/config";
import { ADT, adt } from "shared/lib/types";
import { GUIDE_AUDIENCE } from "front-end/lib/pages/guide/view";
import { User } from "shared/lib/resources/user";
import { formatAmount } from "shared/lib";
import { CostRecoveryLearnMore } from "front-end/lib/pages/learn-more";

export interface State {
  viewerUser?: User;
  isVendorAccordionOpen: boolean;
  isPublicSectorAccordionOpen: boolean;
}

type InnerMsg =
  | ADT<"noop">
  | ADT<"toggleVendorAccordion">
  | ADT<"togglePublicSectorAccordion">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

export type RouteParams = null;

const init: component_.page.Init<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = ({ shared }) => [
  {
    viewerUser: shared.session?.user,
    isVendorAccordionOpen: true,
    isPublicSectorAccordionOpen: false
  },
  [component_.cmd.dispatch(component_.page.readyMsg())]
];

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "toggleVendorAccordion":
      return [state.update("isVendorAccordionOpen", (v) => !v), []];
    case "togglePublicSectorAccordion":
      return [state.update("isPublicSectorAccordionOpen", (v) => !v), []];
    default:
      return [state, []];
  }
};

const TitleView: component_.page.View<State, InnerMsg, Route> = ({ state }) => {
  return (
    <div className="bg-c-learn-more-bg pt-4 pb-6 pb-md-7">
      <Container>
        <Row>
          <Col xs="12">
            <h1 className="mb-4">Code With Us</h1>
          </Col>
        </Row>
        <Row>
          <Col xs="12" md="8">
            <p className="mb-0">
              <em>Code With Us</em> is a procurement mechanism for public sector
              organizations in {COPY.region.name.long} to pay developers for
              code.
            </p>
            <CostRecoveryLearnMore user={state.viewerUser}>
              <>
                *Code With Us is funded via Cost Recovery and charges{" "}
                <b className="font-size-large">
                  {formatAmount(CWU_COST_RECOVERY_FIGURE, "$")} CAD
                </b>{" "}
                per competition.
              </>
            </CostRecoveryLearnMore>
          </Col>
          <Col md="4" className="align-self-end">
            <img
              style={{
                maxWidth: "250px",
                transform: "translateY(-48px)"
              }}
              className="d-none d-md-block position-absolute ms-6"
              src={prefixPath(
                "/images/illustrations/code_with_us_learn_more.svg"
              )}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const VendorView: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  return (
    <div className="bg-white pt-6">
      <Container>
        <Row>
          <Col xs="12" md="8">
            <Accordion
              toggle={() => dispatch(adt("toggleVendorAccordion"))}
              color="info"
              title="Vendors"
              titleClassName="h2 mb-0 ms-2"
              icon="store"
              iconColor="info"
              iconWidth={2.5}
              iconHeight={2.5}
              chevronWidth={2}
              chevronHeight={2}
              open={state.isVendorAccordionOpen}>
              <div className="mb-3">
                We know that there are tons of brilliant tech professionals like
                you who never get an opportunity to apply their skills to public
                service. We want to change that!
              </div>
              <div className="mb-5">
                <em>Code With Us</em> makes it easy to get paid for contributing
                to government’s digital services by providing a process that
                allows you to focus on writing code, not contract paperwork.
              </div>
              <VendorHIW />
              <div className="d-flex flex-column flex-sm-row mt-5 flex-nowrap align-items-start align-items-sm-center">
                <Link
                  button
                  dest={routeDest(
                    adt("cwuGuide", {
                      guideAudience: GUIDE_AUDIENCE.Vendor
                    })
                  )}
                  color="info"
                  outline
                  symbol_={leftPlacement(iconLinkSymbol("book-user"))}
                  className="mb-4 mb-sm-0 me-0 me-sm-4 text-nowrap">
                  Read the Guide
                </Link>
                <Link
                  button
                  dest={routeDest(adt("opportunities", null))}
                  color="primary"
                  symbol_={leftPlacement(iconLinkSymbol("search"))}
                  className="text-nowrap">
                  Browse Opportunities
                </Link>
              </div>
            </Accordion>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const VendorHIW: component_.base.View = () => {
  return (
    <div>
      <h3 className="mb-4">How It Works</h3>
      <HowItWorksItem
        symbol_={adt("icon", "search" as const)}
        title="Search"
        description="Find an opportunity that matches your skills and interest. The acceptance criteria describes what you need to deliver to get paid the fixed price."
        className="mb-4"
      />
      <HowItWorksItem
        symbol_={adt("icon", "comments-alt" as const)}
        title="Connect"
        description="Speak directly with the opportunity contact to get more clarity. If you have suggestions, or think the price is too low, say so!"
        className="mb-4"
      />
      <HowItWorksItem
        symbol_={adt("icon", "paper-plane" as const)}
        title="Apply"
        description="Submit a proposal using the app. If you are awarded the opportunity, you will be offered the exclusive right to work on the issue for a set period of time."
        className="mb-4"
      />
      <HowItWorksItem
        symbol_={adt("icon", "code" as const)}
        title="Contribute"
        description="Work collaboratively and iteratively with the opportunity contact. Commit code early and often to ensure you are on the right track."
        className="mb-4"
      />
      <HowItWorksItem
        symbol_={adt("icon", "sack-dollar" as const)}
        title="Get Paid"
        description={
          <p>
            Once the acceptance criteria is met and your code is merged, submit
            your invoice and expect payment within 30 days. Read more about
            payment options{" "}
            <Link dest={adt("external", CWU_PAYMENT_OPTIONS_URL)}>here</Link>.
          </p>
        }
        className="mb-4"
      />
    </div>
  );
};

const PublicSectorView: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  return (
    <div className="bg-white pt-5 pb-6">
      <Container>
        <Row>
          <Col xs="12" md="8">
            <Accordion
              toggle={() => dispatch(adt("togglePublicSectorAccordion"))}
              color="info"
              title="Public Sector"
              titleClassName="h2 mb-0 ms-2"
              icon="government"
              iconColor="info"
              iconWidth={2.5}
              iconHeight={2.5}
              chevronWidth={2}
              chevronHeight={2}
              open={state.isPublicSectorAccordionOpen}>
              <div className="mb-3">
                If you manage an open source digital product in the{" "}
                {COPY.region.name.long} public sector, <em>Code With Us</em> can
                help you access talented developers and pay for code quickly.
              </div>
              <div className="mb-5">
                Post an opportunity, evaluate proposals, assign a developer and
                get to work!
              </div>
              <div className="d-flex flex-row mt-5 flex-nowrap">
                <Link
                  button
                  dest={routeDest(
                    adt("cwuGuide", {
                      guideAudience: GUIDE_AUDIENCE.Ministry
                    })
                  )}
                  color="info"
                  outline
                  symbol_={leftPlacement(iconLinkSymbol("book-user"))}
                  className="me-3 text-nowrap">
                  Read the Guide
                </Link>
              </div>
            </Accordion>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  return (
    <div className="d-flex flex-column flex-grow-1">
      <TitleView state={state} dispatch={dispatch} />
      <VendorView state={state} dispatch={dispatch} />
      <PublicSectorView state={state} dispatch={dispatch} />
      <div className="flex-grow-1 bg-white"></div>
    </div>
  );
};

export const component: component_.page.Component<
  RouteParams,
  SharedState,
  State,
  InnerMsg,
  Route
> = {
  fullWidth: true,
  backgroundColor: "c-learn-more-bg",
  init,
  update,
  view,
  getMetadata() {
    return makePageMetadata("Code With Us - Learn More");
  }
};
