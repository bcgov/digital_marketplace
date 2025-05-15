import { component } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import React from "react";
import { Col, Row } from "reactstrap";

interface QualifiedTagProps {
  programName: string;
}

const QualifiedTag: component.base.View<QualifiedTagProps> = ({
  programName
}) => (
  <>
    <Icon
      name="shield-check"
      color="success"
      width={0.9}
      height={0.9}
      className="me-1"
    />
    <span className="font-size-small me-3">{programName} Qualified</span>
  </>
);

export interface Props {
  legalName: string;
  swuQualified: boolean;
  twuQualified: boolean;
}

const EditTabHeader: component.base.View<Props> = ({
  legalName,
  swuQualified,
  twuQualified
}) => {
  return (
    <Row>
      <Col xs="12">
        <h2>{legalName}</h2>
        {swuQualified || twuQualified ? (
          <div className="d-flex align-items-center flex-nowrap">
            {swuQualified ? (
              <QualifiedTag programName="Sprint With Us" />
            ) : null}
            {twuQualified ? <QualifiedTag programName="Team With Us" /> : null}
          </div>
        ) : null}
      </Col>
    </Row>
  );
};

export default EditTabHeader;
