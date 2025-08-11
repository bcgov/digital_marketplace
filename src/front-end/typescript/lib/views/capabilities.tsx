import { component } from "front-end/lib/framework";
import Icon from "front-end/lib/views/icon";
import React from "react";
import { Col, Row } from "reactstrap";

export interface Capability {
  capability: string;
  checked?: boolean;
  fullTime?: boolean;
}

export interface Props {
  className?: string;
  capabilities: Capability[];
  grid?: boolean;
  showFullOrPartTime?: boolean;
  showChecked?: boolean;
}

interface CapabilityProps extends Capability {
  showFullOrPartTime: boolean;
  showChecked: boolean;
}

const Capability: component.base.View<CapabilityProps> = ({
  capability,
  fullTime,
  checked,
  showChecked,
  showFullOrPartTime
}) => {
  return (
    <div className="border-end border-bottom d-flex flex-nowrap align-items-center p-2">
      {showChecked ? (
        <Icon
          name={checked ? "check-circle" : "circle"}
          color={checked ? "success" : "secondary"}
          className="me-2 flex-shrink-0"
          width={0.9}
          height={0.9}
        />
      ) : null}
      <div
        className={`py-1 font-size-small text-nowrap me-2 ${
          checked || !showChecked ? "text-body" : "text-secondary"
        }`}>
        {capability}
      </div>
      {showFullOrPartTime ? (
        <div
          style={{ width: "2rem", height: "1.75rem" }}
          className={`d-flex justify-content-center align-items-center flex-shrink-0 small ms-auto rounded fw-bold text-white ${
            fullTime ? "bg-c-capability-ft-bg" : "bg-c-capability-pt-bg"
          }`}>
          {fullTime ? "F/T" : "P/T"}
        </div>
      ) : null}
    </div>
  );
};

const Capabilities: component.base.View<Props> = ({
  className = "",
  capabilities,
  grid,
  showChecked = true,
  showFullOrPartTime = false
}) => {
  return (
    <Row className={`border-top border-start ${className} g-0`}>
      {capabilities.map((c, i) => (
        <Col xs="12" md={grid ? "6" : undefined} key={`phase-capability-${i}`}>
          <Capability
            {...c}
            showChecked={showChecked}
            showFullOrPartTime={showFullOrPartTime}
          />
        </Col>
      ))}
    </Row>
  );
};

export default Capabilities;
