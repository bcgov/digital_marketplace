import { Route } from "front-end/lib/app/types";
import { component as component_ } from "front-end/lib/framework";
import * as Tab from "front-end/lib/pages/organization/edit/tab";
import EditTabHeader from "front-end/lib/pages/organization/lib/views/edit-tab-header";
import {
  acceptedSWUTermsText,
  TITLE as SWU_TERMS_TITLE
} from "front-end/lib/pages/organization/sprint-with-us-terms";
import Icon from "front-end/lib/views/icon";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { doesOrganizationMeetSWUQualificationNumTeamMembers } from "shared/lib/resources/organization";
import { isAdmin, isVendor } from "shared/lib/resources/user";
import { adt, ADT } from "shared/lib/types";

export type State = Tab.Params;

export type InnerMsg = ADT<"noop">;

export type Msg = component_.page.Msg<InnerMsg, Route>;

const init: component_.base.Init<Tab.Params, State, Msg> = (params) => {
  return [params, []];
};

const update: component_.base.Update<State, Msg> = ({ state }) => {
  return [state, []];
};

interface RequirementProps {
  name: string | component_.base.ViewElement;
  description: string;
  checked: boolean;
  className?: string;
}

const Requirement: component_.base.View<RequirementProps> = ({
  name,
  description,
  checked,
  className = ""
}) => {
  return (
    <div className={`d-flex flex-nowrap align-items-start ${className}`}>
      <Icon
        name={checked ? "check-circle" : "circle"}
        color={checked ? "success" : "body"}
        className="me-2 mt-1 flex-shrink-0"
      />
      <div className="flex-grow-1">
        <div className="mb-1">{name}</div>
        <div className="small text-secondary">{description}</div>
      </div>
    </div>
  );
};

const view: component_.base.ComponentView<State, Msg> = ({ state }) => {
  return (
    <div>
      <EditTabHeader
        legalName={state.organization.legalName}
        swuQualified={state.swuQualified}
        twuQualified={state.twuQualified}
      />
      <Row className="mt-5">
        <Col xs="12">
          <h3>Requirements</h3>
          <p className="mb-4">
            To qualify to submit proposals for Sprint With Us opportunities,
            your organization must meet the following requirements:
          </p>
          <Requirement
            className="mb-4"
            name="At least two team members."
            description='Add team members from the "Team" tab to begin the process of satisfying this requirement.'
            checked={doesOrganizationMeetSWUQualificationNumTeamMembers(
              state.organization
            )}
          />
          <Requirement
            className="mb-4"
            name="Team members collectively possess all capabilities."
            description="Your team members can choose their capabilities on their user profiles."
            checked={!!state.organization.possessAllCapabilities}
          />
          <Requirement
            name={`Agreed to ${SWU_TERMS_TITLE}.`}
            description={`You can view the ${SWU_TERMS_TITLE} below.`}
            checked={!!state.organization.acceptedSWUTerms}
          />
        </Col>
      </Row>
      <div className="mt-5 pt-5 border-top">
        <Row>
          <Col xs="12">
            <h3>Terms & Conditions</h3>
            <p className="mb-4">
              {acceptedSWUTermsText(
                state.organization,
                `View the ${SWU_TERMS_TITLE} by clicking the button below.`
              )}
            </p>
            <Link
              button
              color="primary"
              dest={routeDest(
                adt("orgSWUTerms", { orgId: state.organization.id })
              )}>
              View Terms & Conditions
            </Link>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export const component: Tab.Component<State, Msg> = {
  init,
  update,
  view,
  onInitResponse() {
    return component_.page.readyMsg();
  },
  getAlerts: (state) => ({
    info: (() => {
      if (!state.swuQualified) {
        if (isVendor(state.viewerUser)) {
          return [
            {
              text: (
                <div>
                  This organization is not qualified to apply for{" "}
                  <em>Sprint With Us</em> opportunities. You must apply to
                  become a Qualified Supplier.
                </div>
              )
            }
          ];
        } else if (isAdmin(state.viewerUser)) {
          return [
            {
              text: (
                <div>
                  This organization is not qualified to apply for{" "}
                  <em>Sprint With Us</em> opportunities.
                </div>
              )
            }
          ];
        }
      }
      return [];
    })()
  })
};
