import { component } from "front-end/lib/framework";
import Link, { ButtonProps, routeDest } from "front-end/lib/views/link";
import React from "react";
import { Col } from "reactstrap";
import { formatAmount } from "shared/lib";
import { adt } from "shared/lib/types";

export interface Props {
  img: string;
  title: string;
  description: component.base.ViewElement;
  className?: string;
  links: ButtonProps[];
  wideLinks?: boolean;
  costRecoveryDetails: {
    amount: number;
    show: boolean;
  };
}

/**
 * Defines a block of content, current column width suitable for 3 horizontal blocks
 *
 * @param param0 - all the properties (img, title, etc) required to make a card
 * @returns - HTML in a box
 */
const ProgramCard: component.base.View<Props> = ({
  img,
  title,
  description,
  links,
  wideLinks,
  className,
  costRecoveryDetails
}) => {
  return (
    <Col xs="12" md="4" className={className}>
      <div className="d-flex flex-column align-items-center bg-white rounded-3 border p-4 p-sm-5 text-center h-100 shadow-hover">
        <img
          src={img}
          className="w-100"
          style={{ maxHeight: "200px" }}
          alt={`${title} Image`}
        />
        <h2 className="my-4">{title}</h2>
        <div className="mb-4 mb-sm-5">{description}</div>
        <div
          className={`mt-auto d-flex flex-column ${
            wideLinks ? "align-self-stretch" : ""
          } `}>
          {costRecoveryDetails.show ? (
            <div className="mx-auto mb-3">
              Price:{" "}
              <b className="font-size-large">
                {formatAmount(costRecoveryDetails.amount, "$")} CAD
              </b>
              <br />
              via Cost Recovery
              <div>
                <Link
                  className="font-size-small no-wrap"
                  dest={routeDest(
                    adt("contentView", "service-level-agreement")
                  )}>
                  See Service Level Agreement for details
                </Link>
              </div>
            </div>
          ) : null}
          {links.map((link, index) => (
            <Link
              {...link}
              className={`justify-content-center ${
                index < links.length - 1 ? "mb-3" : ""
              }`}
              key={`program-card-link-${index}`}
            />
          ))}
        </div>
      </div>
    </Col>
  );
};

export default ProgramCard;
