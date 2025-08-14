import { getSignInUrl } from "front-end/lib";
import { component } from "front-end/lib/framework";
import Icon, { AvailableIcons } from "front-end/lib/views/icon";
import Link, { externalDest } from "front-end/lib/views/link";
import React from "react";
import { Col, Row } from "reactstrap";
import { isVendor, UserType } from "shared/lib/resources/user";

export interface Props {
  title: string;
  description: string;
  buttonText: string;
  userType: UserType.Vendor | UserType.Government;
  redirectOnSuccess?: string;
}

function userTypeToIcon(userType: Props["userType"]): AvailableIcons {
  switch (userType) {
    case UserType.Vendor:
      return "vendor";
    case UserType.Government:
      return "government";
  }
}

export const SignInCard: component.base.View<Props> = (props) => {
  return (
    <Row>
      <Col xs="12">
        <div className="mx-auto bg-white p-4 shadow-hover mb-4 border rounded-1">
          <h3 className="d-flex align-items-start flex-nowrap">
            <Icon
              name={userTypeToIcon(props.userType)}
              width={isVendor({ type: props.userType }) ? 1.75 : 2}
              height={1.75}
              className="mt-1 flex-shrink-0"
              color="info"
            />
            <span className="ps-2">{props.title}</span>
          </h3>
          <p>{props.description}</p>
          <Link
            button
            dest={externalDest(
              getSignInUrl(props.userType, props.redirectOnSuccess)
            )}
            className="btn-primary">
            {props.buttonText}
          </Link>
        </div>
      </Col>
    </Row>
  );
};

export default SignInCard;
