import { component } from "front-end/lib/framework";
import { ThemeColor } from "front-end/lib/types";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import React, { ReactElement } from "react";
import { Col, Row } from "reactstrap";
import { ADT } from "shared/lib/types";

type Symbol_ = ADT<"icon", AvailableIcons> | ADT<"text", string>;

export interface Props {
  symbol_: Symbol_;
  mobileSymbol?: Symbol_;
  fgColor?: ThemeColor;
  bgColor?: ThemeColor;
  title: string;
  description?: string | ReactElement;
  className?: string;
}

export const HowItWorksItem: component.base.View<Props> = ({
  symbol_,
  mobileSymbol,
  bgColor = "c-how-it-works-item-bg",
  fgColor = "white",
  title,
  description,
  className
}) => {
  mobileSymbol = mobileSymbol || symbol_;
  return (
    <Row className={className}>
      <Col xs="12" className="d-flex flex-nowrap align-items-start">
        <div
          className={`d-none d-sm-flex justify-content-center align-items-center rounded-circle bg-${bgColor} p-3 me-4`}>
          {symbol_.tag === "icon" ? (
            <Icon name={symbol_.value} color={fgColor} width={2} height={2} />
          ) : (
            <div
              className={`d-flex justify-content-center align-items-center flex-nowrap h2 mb-0 text-${fgColor} position-relative`}
              style={{ width: "2rem", height: "2rem" }}>
              {symbol_.value}
            </div>
          )}
        </div>
        <div className="d-flex flex-column flex-grow-1">
          <div className="d-flex flex-nowrap align-items-center mb-2">
            <div className={`d-block d-sm-none text-${bgColor} me-2`}>
              {mobileSymbol.tag === "icon" ? (
                <Icon name={mobileSymbol.value} width={1.25} height={1.25} />
              ) : (
                <span className="fw-bold">{mobileSymbol.value}</span>
              )}
            </div>
            <strong>{title}</strong>
          </div>
          <div className="mb-0">{description}</div>
        </div>
      </Col>
    </Row>
  );
};

export default HowItWorksItem;
