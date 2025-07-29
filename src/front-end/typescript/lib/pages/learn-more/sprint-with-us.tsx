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
import { COPY, VENDOR_IDP_NAME } from "shared/config";
import { ADT, adt } from "shared/lib/types";
import { GUIDE_AUDIENCE } from "front-end/lib/pages/guide/view";
import { CostRecoveryLearnMore } from "front-end/lib/pages/learn-more";
import { formatAmount } from "shared/lib";
import { SWU_COST_RECOVERY_FIGURE } from "front-end/config";
import { User } from "shared/lib/resources/user";

export interface State {
  viewerUser?: User;
  isWhatToExpectAccordionOpen: boolean;
  isHowToApplyAccordionOpen: boolean;
}

type InnerMsg =
  | ADT<"noop">
  | ADT<"toggleWhatToExpectAccordion">
  | ADT<"toggleHowToApplyAccordion">;

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
    isWhatToExpectAccordionOpen: true,
    isHowToApplyAccordionOpen: true
  },
  [component_.cmd.dispatch(component_.page.readyMsg())]
];

const update: component_.page.Update<State, InnerMsg, Route> = ({
  state,
  msg
}) => {
  switch (msg.tag) {
    case "toggleWhatToExpectAccordion":
      return [state.update("isWhatToExpectAccordionOpen", (v) => !v), []];
    case "toggleHowToApplyAccordion":
      return [state.update("isHowToApplyAccordionOpen", (v) => !v), []];
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
            <h1 className="mb-4">Sprint With Us</h1>
          </Col>
        </Row>
        <Row>
          <Col xs="12" md="8">
            <p className="mb-0">
              <em>Sprint With Us</em> is a procurement mechanism that allows the{" "}
              {COPY.gov.name.short} to procure Agile software development teams.
            </p>
            <CostRecoveryLearnMore user={state.viewerUser}>
              <>
                *Sprint With Us is funded via Cost Recovery and charges{" "}
                <b className="font-size-large">
                  {formatAmount(SWU_COST_RECOVERY_FIGURE, "$")} CAD
                </b>{" "}
                per competition.
              </>
            </CostRecoveryLearnMore>
          </Col>
          <Col md="4" className="align-self-end">
            <img
              style={{ maxWidth: "213px", transform: "translateY(-48px)" }}
              className="d-none d-md-block position-absolute mt-n5 ms-6"
              src={prefixPath(
                "/images/illustrations/sprint_with_us_learn_more.svg"
              )}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

const WhatToExpectView: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  return (
    <div className="pt-6 bg-white">
      <Container>
        <Row>
          <Col xs="12" md="8">
            <Accordion
              toggle={() => dispatch(adt("toggleWhatToExpectAccordion"))}
              color="info"
              title="What To Expect"
              titleClassName="h2 mb-0"
              chevronWidth={2}
              chevronHeight={2}
              open={state.isWhatToExpectAccordionOpen}>
              <p className="mb-5">
                If your organization is awarded a Sprint With Us opportunity,
                here is what you can expect when you work with us:
              </p>
              <Row>
                <Col xs="12" md="6">
                  <InfoBlockView
                    className="mb-4"
                    title="Government Product Managers"
                    description="You will work closely with a trained government product manager who has the expertise and the responsibility to run the service."
                  />
                  <InfoBlockView
                    className="mb-4"
                    title="Interdisciplinary Teams"
                    description="Your team will possess all the skills necessary for continuous delivery, such as DevOps engineering, front-end and back-end development, and user experience research and design."
                  />
                  <InfoBlockView
                    className="mb-4 mb-md-0"
                    title="Open Source"
                    description="Your team will own the code that's produced, but it will be published in GitHub under an open source license."
                  />
                </Col>
                <Col xs="12" md="6">
                  <InfoBlockView
                    className="mb-4"
                    title="Agile"
                    description="You will be adaptable to change and follow the Agile Scrum process, building and validating features iteratively with users."
                  />
                  <InfoBlockView
                    className="mb-4"
                    title="Agile Phases"
                    description="Don’t expect lengthy requirements. This is Agile. You will start with Inception to understand the business problem, then build a Proof of Concept to demonstrate feasability of the solution. Finally, you will build out the rest of the product in Implementation."
                  />
                  <InfoBlockView
                    title="Pricing & Incentives"
                    description="These are not time & materials contracts! For each phase, you'll charge a fixed price for your interdisciplinary team to meet the deliverables for the time period. There's incentives to complete a phase early!"
                  />
                </Col>
              </Row>
            </Accordion>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

interface InfoBlockProps {
  title: string;
  description: string;
  className?: string;
}

const InfoBlockView: component_.base.View<InfoBlockProps> = ({
  title,
  description,
  className
}) => {
  return (
    <div className={className}>
      <div className="d-flex flex-column align-items-center border bg-white rounded-3 py-4 py-md-5 px-4 text-center h-100">
        <h4 className="my-3">{title}</h4>
        <div className="mb-2">{description}</div>
      </div>
    </div>
  );
};

export const HowToApplyView: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  return (
    <div className="pt-5 pb-6 bg-white">
      <Container>
        <Row>
          <Col xs="12" md="8">
            <Accordion
              toggle={() => dispatch(adt("toggleHowToApplyAccordion"))}
              color="info"
              title="How To Apply"
              titleClassName="h2 mb-0"
              chevronWidth={2}
              chevronHeight={2}
              open={state.isHowToApplyAccordionOpen}>
              <p className="mb-4">
                To apply for <em>Sprint With Us</em> opportunities, complete the
                following steps:
              </p>
              <HowItWorksItem
                symbol_={adt("text", "1")}
                mobileSymbol={adt("text", "1.")}
                title="Sign In to Your Vendor Account"
                description={
                  <div>
                    <Link dest={routeDest(adt("signIn", {}))}>Sign in</Link> to
                    your Digital Marketplace Vendor account using{" "}
                    {VENDOR_IDP_NAME}. If you do not yet have an account, you
                    must{" "}
                    <Link dest={routeDest(adt("signUpStepOne", {}))}>
                      sign up
                    </Link>
                    , first.
                  </div>
                }
                className="mb-4"
              />
              <HowItWorksItem
                symbol_={adt("text", "2")}
                mobileSymbol={adt("text", "2.")}
                title="Register Your Organization"
                description={
                  <div>
                    <p>
                      Go to the <em>Organizations</em> page and click on the{" "}
                      <strong>+ Create Organization</strong> button. Complete
                      the form by providing all required information and submit.
                    </p>
                    <p className="mb-0">
                      Similarly, you may register your organization via your
                      user profile.
                    </p>
                  </div>
                }
                className="mb-4"
              />
              <HowItWorksItem
                symbol_={adt("text", "3")}
                mobileSymbol={adt("text", "3.")}
                title="Become a Qualified Supplier"
                description={
                  <div>
                    <p>
                      You must be considered a Qualified Supplier to apply for{" "}
                      <em>Sprint With Us</em> opportunities.
                    </p>
                    <p className="mb-0">
                      To complete the qualification process, access your
                      registered organization via your user profile and navigate
                      to the <em>SWU Qualification</em> tab. Complete the
                      requirements as provided to become a Qualified Supplier.
                    </p>
                  </div>
                }
              />
              <div className="d-flex flex-column flex-sm-row mt-5 flex-nowrap align-items-start align-items-sm-center">
                <Link
                  button
                  dest={routeDest(
                    adt("swuGuide", {
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

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  return (
    <div className="d-flex flex-column flex-grow-1">
      <TitleView state={state} dispatch={dispatch} />
      <WhatToExpectView state={state} dispatch={dispatch} />
      <HowToApplyView state={state} dispatch={dispatch} />
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
    return makePageMetadata("Sprint With Us - Learn More");
  }
};
