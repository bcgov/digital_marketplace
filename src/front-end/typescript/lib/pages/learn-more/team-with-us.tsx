import { TWU_BC_BID_URL, TWU_COST_RECOVERY_FIGURE } from "front-end/config";
import { makePageMetadata, prefixPath } from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import Accordion from "front-end/lib/views/accordion";
import { HowItWorksItem } from "front-end/lib/views/how-it-works-item";
import Link, {
  emailDest,
  externalDest,
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Container, Row } from "reactstrap";
import { CONTACT_EMAIL, COPY, VENDOR_IDP_NAME } from "shared/config";
import ALL_SERVICE_AREAS from "shared/lib/data/service-areas";
import { ADT, adt } from "shared/lib/types";
import { GUIDE_AUDIENCE } from "front-end/lib/pages/guide/view";
import { twuServiceAreaToTitleCase } from "../opportunity/team-with-us/lib";
import { CostRecoveryLearnMore } from "front-end/lib/pages/learn-more";
import { formatAmount } from "shared/lib";
import { User } from "shared/lib/resources/user";

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
            <h1 className="mb-4">Team With Us</h1>
          </Col>
        </Row>
        <Row>
          <Col xs="12" md="8">
            <p className="mb-0">
              <em>Team With Us</em> is a procurement product that allows the{" "}
              {COPY.gov.name.short} to procure individual resources for Agile
              software development teams.
            </p>
            <CostRecoveryLearnMore user={state.viewerUser}>
              <>
                *Team With Us is funded via Cost Recovery and charges{" "}
                <b className="font-size-large">
                  {formatAmount(TWU_COST_RECOVERY_FIGURE, "$")} CAD
                </b>{" "}
                per competition.
              </>
            </CostRecoveryLearnMore>
          </Col>
          <Col md="4" className="align-self-end">
            <img
              style={{ maxWidth: "250px", transform: "translateY(-48px)" }}
              className="d-none d-md-block position-absolute ms-6"
              src={prefixPath(
                "/images/illustrations/team_with_us_learn_more.svg"
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
              <div className="mb-5">
                <em>Team With Us</em> allows private-sector vendors to provide
                individual tech resources to government development teams. To
                participate in these competitions, vendors must first
                pre-qualify for one or more <em>Team With Us</em> service areas.
              </div>
              <VendorHIW />
              <div className="d-flex flex-column flex-sm-row mt-5 flex-nowrap align-items-start align-items-sm-center">
                <Link
                  button
                  dest={routeDest(
                    adt("twuGuide", {
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
      <h3 className="mb-4">How To Qualify</h3>
      <p className="mb-4">
        You must be considered a Qualified Supplier to apply for{" "}
        <em>Team With Us</em> opportunities.
      </p>
      <HowItWorksItem
        symbol_={adt("text", "1")}
        mobileSymbol={adt("text", "1.")}
        title="Review the Pre-Qualification Documents"
        description={
          <p className="mb-0">
            Review the <em>Team With Us</em> MULRFQ on{" "}
            <Link dest={externalDest(TWU_BC_BID_URL)} newTab>
              BC Bid
            </Link>
            .
          </p>
        }
        className="mb-4"
      />
      <HowItWorksItem
        symbol_={adt("text", "2")}
        mobileSymbol={adt("text", "2.")}
        title="Apply to Become a Supplier"
        description={
          <div>
            <p>
              You can apply to become a supplier for one or more of the
              following service areas:
            </p>
            <ul>
              {ALL_SERVICE_AREAS.map((serviceArea) => (
                <li key={serviceArea}>
                  {twuServiceAreaToTitleCase(serviceArea)}
                </li>
              ))}
            </ul>
            <p className="mb-0">
              The <em>Team With Us</em> opportunity on BC Bid has the response
              forms that you will need to complete.
            </p>
          </div>
        }
        className="mb-4"
      />
      <HowItWorksItem
        symbol_={adt("text", "3")}
        mobileSymbol={adt("text", "3.")}
        title="Submit Your Response"
        description={
          <div>
            <p>
              Once you have drafted your response to the MULRFQ, you can submit
              your response:
            </p>
            <ul className="mb-0">
              <li>
                Electronic submission - BC Bid website; or through BC Bid
                application; or
              </li>
              <li>
                Email submission -{" "}
                <Link dest={emailDest([CONTACT_EMAIL])}>{CONTACT_EMAIL}</Link>
              </li>
            </ul>
          </div>
        }
        className="mb-4"
      />
      <HowItWorksItem
        symbol_={adt("text", "4")}
        mobileSymbol={adt("text", "4.")}
        title="Evaluation"
        description="Once you have submitted your response to the MULRFQ, the Digital Marketplace team will evaluate your response. Following evaluation, the Digital Marketplace team will notify you with the evaluation results. If you receive a passing score for a given service area, you will be added to that service area's list of pre-qualified vendors."
        className="mb-5"
      />
      <h3 className="mb-4">How To Apply</h3>
      <p className="mb-4">
        To apply for <em>Team With Us</em> opportunities, you must complete the
        following steps:
      </p>
      <HowItWorksItem
        symbol_={adt("text", "1")}
        mobileSymbol={adt("text", "1.")}
        title="Sign In to Your Vendor Account"
        description={
          <div>
            <Link dest={routeDest(adt("signIn", {}))}>Sign in</Link> to your
            Digital Marketplace Vendor account using {VENDOR_IDP_NAME}. If you
            do not yet have an account, you must{" "}
            <Link dest={routeDest(adt("signUpStepOne", {}))}>sign up</Link>,
            first.
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
              <strong>+ Create Organization</strong> button. Complete the form
              by providing all required information and submit.
            </p>
            <p className="mb-0">
              Similarly, you may register your organization via your user
              profile.
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
              See the instructions above in the &quot;How to Qualify&quot;
              section.
            </p>
            <p className="mb-0">
              To complete the qualification process, access your registered
              organization via your user profile and navigate to the{" "}
              <em>TWU Qualification</em> tab. Complete the requirements as
              provided to become a Qualified Supplier.
            </p>
          </div>
        }
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
                {COPY.region.name.long} public sector, <em>Team With Us</em> can
                help you add talented developers, Agile coaches, DevOps
                specialists and Data professionals to your team.
              </div>
              <div className="mb-5">
                Post an opportunity, evaluate proposals, run a skills challenge,
                and add a new resource to your team!
              </div>
              <div className="d-flex flex-row mt-5 flex-nowrap">
                <Link
                  button
                  dest={routeDest(
                    adt("twuGuide", {
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
    return makePageMetadata("Team With Us - Learn More");
  }
};
