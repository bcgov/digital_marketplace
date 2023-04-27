import { component } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import Link, { routeDest } from "front-end/lib/views/link";
import React from "react";
import { Container, Row, Col } from "reactstrap";
import { adt } from "shared/lib/types";

interface Props {
  show: boolean;
  onClose(): void;
}

const TWUBannner: component.base.View<Props> = ({ show, onClose }) => {
  return show ? (
    <div className="main-wrapper twu-banner">
      <div className="main">
        <Container>
          <Row className="text-center align-items-center">
            <Col className="flex-grow-1">
              We are introducing <strong>Team With Us (in Beta)</strong>. Please
              feel free to create and respond to test opportunities.{" "}
              <Link
                color="black"
                className="text-decoration-underline"
                dest={routeDest(adt("learnMoreTWU", null))}>
                Learn more about Team With Us
              </Link>
            </Col>
            <Col className="flex-grow-0">
              <Icon
                hover
                width={1.4}
                height={1.4}
                name="times"
                color="black"
                onClick={onClose}
              />
            </Col>
          </Row>
        </Container>
      </div>
    </div>
  ) : null;
};

export default TWUBannner;
