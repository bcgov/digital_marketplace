import { makePageMetadata, prefixPath } from "front-end/lib";
import { Route, SharedState } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import Accordion from "front-end/lib/views/accordion";
import Link, {
  iconLinkSymbol,
  leftPlacement,
  routeDest
} from "front-end/lib/views/link";
import React from "react";
import { Col, Container, Row } from "reactstrap";
import { COPY } from "shared/config";
import { ADT, adt } from "shared/lib/types";

export interface State {
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
> = () => [
  {
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

// TODO - update Lorem ipsum dolor with real content
const TitleView: component_.base.View = () => {
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
              <em>Team With Us</em> is a procurement mechanism for public sector
              organizations in {COPY.region.name.long} to pay developers for
              code.
            </p>
          </Col>
          <Col md="4">
            <img
              style={{ maxWidth: "250px" }}
              className="d-none d-md-block position-absolute ml-6"
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
              titleClassName="h2 mb-0 ml-2"
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
                <em>Team With Us</em> makes it easy to get paid for contributing
                to government’s digital services by providing a process that
                allows you to focus on writing code, not contract paperwork.
              </div>
              <VendorHIW />
              <div className="d-flex flex-column flex-sm-row mt-5 flex-nowrap align-items-start align-items-sm-center">
                <Link
                  button
                  dest={routeDest(
                    adt("contentView", "code-with-us-proposal-guide")
                  )}
                  color="info"
                  outline
                  symbol_={leftPlacement(iconLinkSymbol("book-user"))}
                  className="mb-4 mb-sm-0 mr-0 mr-sm-4 text-nowrap">
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

// TODO - update Lorem ipsum dolor with real content
const VendorHIW: component_.base.View = () => {
  return (
    <div>
      <h3 className="mb-4">How It Works</h3>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Amet risus nullam
        eget felis eget nunc lobortis mattis. Est ullamcorper eget nulla
        facilisi etiam dignissim diam quis enim. Elementum facilisis leo vel
        fringilla. Ut placerat orci nulla pellentesque dignissim enim. Sed arcu
        non odio euismod lacinia at quis risus. Malesuada nunc vel risus commodo
        viverra maecenas accumsan. Blandit libero volutpat sed cras ornare arcu
        dui. Eu sem integer vitae justo eget magna fermentum iaculis. Mauris
        pellentesque pulvinar pellentesque habitant morbi tristique senectus et.
        Consequat semper viverra nam libero justo laoreet sit amet. Quisque
        egestas diam in arcu. Sit amet nisl purus in. Nisi vitae suscipit tellus
        mauris a. Pulvinar etiam non quam lacus suspendisse. Lectus vestibulum
        mattis ullamcorper velit sed ullamcorper. In cursus turpis massa
        tincidunt dui ut ornare.
      </p>
    </div>
  );
};

const view: component_.page.View<State, InnerMsg, Route> = ({
  state,
  dispatch
}) => {
  return (
    <div className="d-flex flex-column flex-grow-1">
      <TitleView />
      <VendorView state={state} dispatch={dispatch} />
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
